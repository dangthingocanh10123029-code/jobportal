from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

from app.auth import Actor, optional_user
from app.main import app
from app.modules.postings.memory import InMemoryPostingRepository
from app.modules.postings.router import get_posting_repo
from app.modules.postings.schemas import SearchFilter, SearchQuery

EMP, OTHER = uuid4(), uuid4()

VALID = {
    "title": "Lập trình viên TypeScript",
    "description": "Phát triển cổng tuyển dụng bằng Next.js và Supabase.",
    "location": "Hà Nội",
    "employmentType": "FULL_TIME",
    "salaryMin": None,
    "salaryMax": 20_000_000,
    "applicationDeadline": "2099-11-01T17:00:00+07:00",
    "industry": "IT_SOFTWARE",
    "level": "JUNIOR",
    "experienceYears": 0,
    "headcount": 1,
    "skills": ["TypeScript"],
    "requirements": "Biết TypeScript cơ bản.",
    "benefits": "Lương tháng 13, bảo hiểm.",
}


class Api:
    def __init__(self):
        self.repo = InMemoryPostingRepository({EMP: "ACME"})
        self.actor: Actor | None = None
        self.http = TestClient(app)

    def as_(self, user_id=EMP, role="EMPLOYER"):
        self.actor = Actor(user_id=str(user_id), role=role, claims={"sub": str(user_id)}, token="t")
        return self

    def published(self, **overrides) -> dict:
        posting = self.http.post("/me/postings", json={**VALID, **overrides}).json()
        return self.http.post(f"/me/postings/{posting['id']}/publish").json()


@pytest.fixture
def api():
    api = Api()
    app.dependency_overrides[get_posting_repo] = lambda: api.repo
    app.dependency_overrides[optional_user] = lambda: api.actor
    yield api
    app.dependency_overrides.clear()


def test_create_returns_camel_case_draft(api):
    res = api.as_().http.post("/me/postings", json={**VALID, "title": "  Lập trình viên TypeScript "})
    assert res.status_code == 201
    body = res.json()
    assert body["title"] == "Lập trình viên TypeScript"
    assert body["applicationDeadline"] == "2099-11-01T10:00:00Z"
    assert (body["status"], body["displayStatus"], body["companyName"], body["employerId"]) == (
        "DRAFT", "DRAFT", "ACME", str(EMP))


@pytest.mark.parametrize(
    ("override", "error"),
    [
        ({"title": " abc "}, "Tiêu đề tối thiểu 5 ký tự"),
        ({"title": "x" * 151}, "Tiêu đề tối đa 150 ký tự"),
        ({"description": "ngắn quá"}, "Mô tả tối thiểu 20 ký tự"),
        ({"location": "  "}, "Vui lòng nhập địa điểm"),
        ({"employmentType": "FREELANCE"}, "Loại hình công việc không hợp lệ"),
        ({"salaryMin": -1}, "Lương không được âm"),
        ({"salaryMax": 1.5}, "Lương phải là số nguyên"),
        ({"salaryMax": "10"}, "Lương phải là số"),
        ({"applicationDeadline": "2026-11-01T17:00"}, "Hạn nộp hồ sơ không hợp lệ"),
        ({"applicationDeadline": "mai"}, "Hạn nộp hồ sơ không hợp lệ"),
        ({"industry": "CRYPTO"}, "Ngành nghề không hợp lệ"),
        ({"level": "CEO"}, "Cấp bậc không hợp lệ"),
        ({"experienceYears": 21}, "Số năm kinh nghiệm tối đa 20"),
        ({"experienceYears": -1}, "Số năm kinh nghiệm không được âm"),
        ({"headcount": 0}, "Số lượng tuyển tối thiểu 1"),
        ({"headcount": 1000}, "Số lượng tuyển tối đa 999"),
        ({"skills": [f"Kỹ năng {i}" for i in range(11)]}, "Tối đa 10 kỹ năng"),
        ({"skills": ["  "]}, "Kỹ năng không được để trống"),
        ({"skills": ["x" * 31]}, "Mỗi kỹ năng tối đa 30 ký tự"),
        ({"skills": ["Excel", " excel "]}, "Kỹ năng bị trùng"),
        ({"requirements": "ngắn"}, "Yêu cầu tối thiểu 10 ký tự"),
        ({"benefits": "x" * 5001}, "Quyền lợi tối đa 5000 ký tự"),
        ({"salaryMin": 30, "salaryMax": 20}, "Lương tối thiểu không được lớn hơn lương tối đa"),
    ],
)
def test_create_rejects_invalid_input(api, override, error):
    res = api.as_().http.post("/me/postings", json={**VALID, **override})
    assert res.status_code == 422 and res.json() == {"error": error}


def test_employer_routes_need_employer(api):
    assert api.http.get("/me/postings").status_code == 401
    res = api.as_(role="CANDIDATE").http.post("/me/postings", json=VALID)
    assert res.status_code == 403


def test_lifecycle_and_errors(api):
    api.as_()
    draft = api.http.post("/me/postings", json=VALID).json()
    pid = draft["id"]
    assert api.http.post(f"/me/postings/{pid}/close").json() == {"error": "Không thể chuyển tin sang trạng thái này"}
    assert api.http.post(f"/me/postings/{pid}/publish").json()["status"] == "PUBLISHED"
    assert api.http.put(f"/me/postings/{pid}", json={**VALID, "title": "Senior TypeScript"}).json()["title"] == (
        "Senior TypeScript")
    assert api.http.post(f"/me/postings/{pid}/close").json()["status"] == "CLOSED"
    res = api.http.put(f"/me/postings/{pid}", json=VALID)
    assert (res.status_code, res.json()) == (409, {"error": "Tin đã đóng, không thể sửa"})
    assert [p["id"] for p in api.http.get("/me/postings").json()] == [pid]
    assert api.http.get(f"/me/postings/{pid}").json()["displayStatus"] == "CLOSED"


def test_publish_past_deadline_rejected(api):
    api.as_()
    draft = api.http.post("/me/postings", json={**VALID, "applicationDeadline": "2020-01-01T00:00:00Z"}).json()
    res = api.http.post(f"/me/postings/{draft['id']}/publish")
    assert (res.status_code, res.json()) == (422, {"error": "Hạn nộp hồ sơ phải ở tương lai"})


def test_other_employer_gets_404(api):
    pid = api.as_().published()["id"]
    api.as_(OTHER)
    assert api.http.get(f"/me/postings/{pid}").status_code == 404
    res = api.http.post(f"/me/postings/{pid}/close")
    assert (res.status_code, res.json()) == (404, {"error": "Không tìm thấy tin tuyển dụng"})


def test_public_list_detail_related(api):
    api.as_()
    first = api.published(title="Kế toán tổng hợp")
    second = api.published(title="Kế toán thuế")
    draft = api.http.post("/me/postings", json=VALID).json()
    api.actor = None

    page = api.http.get("/postings", params={"q": "ke toan", "type": "FULL_TIME", "page": "x"}).json()
    assert (page["total"], page["page"], page["pageSize"]) == (2, 1, 20)
    assert [p["title"] for p in page["items"]] == ["Kế toán thuế", "Kế toán tổng hợp"]
    assert "description" not in page["items"][0] and page["items"][0]["companyName"] == "ACME"
    assert api.http.get("/postings", params={"page": "2"}).json()["items"] == []

    detail = api.http.get(f"/postings/{first['id']}").json()
    assert detail["isOpen"] is True and detail["description"] == VALID["description"]
    assert api.repo.views == {UUID(first["id"]): 1}
    assert api.http.get(f"/postings/{draft['id']}").status_code == 404
    assert api.http.get(f"/postings/{uuid4()}").status_code == 404
    assert [p["id"] for p in api.http.get(f"/postings/{first['id']}/related").json()] == [second["id"]]
    assert api.http.get(f"/postings/{draft['id']}/related").json() == []


def test_lost_view_count_does_not_break_detail(api):
    pid = api.as_().published()["id"]

    def boom(_):
        raise RuntimeError("db down")

    api.repo.record_view = boom
    assert api.http.get(f"/postings/{pid}").status_code == 200


def test_search_query_drops_malformed_fields():
    assert SearchQuery.model_validate(
        {"q": "  ke toan ", "location": "Hà Nội", "type": "PART_TIME", "minSalary": "10000000", "page": "2",
         "industry": "SALES", "level": "SENIOR", "exp": "0", "skill": " Excel ", "sort": "salary_desc"}
    ).to_filter() == SearchFilter(q="ke toan", location="Hà Nội", employment_type="PART_TIME", min_salary=10_000_000,
                                  industry="SALES", level="SENIOR", max_experience=0, skill="Excel",
                                  sort="salary_desc", page=2)
    assert SearchQuery.model_validate(
        {"q": "", "location": "   ", "type": "ABC", "minSalary": "-5", "page": "x", "industry": "X", "level": "CEO",
         "exp": "21", "skill": "", "sort": "random"}
    ).to_filter() == SearchFilter()
    assert SearchQuery(min_salary="1e30").to_filter() == SearchFilter()
    assert SearchQuery(q="a" * 150).to_filter().q == "a" * 100
    assert SearchQuery.model_validate({"postedWithinDays": "7"}).to_filter() == SearchFilter(posted_within_days=7)
    for raw in ("0", "31", "x", "1.5"):
        assert SearchQuery(posted_within_days=raw).to_filter() == SearchFilter()


@pytest.mark.parametrize(("raw", "page"), [(None, 1), ("3", 3), ("0", 1), ("-1", 1), ("1.5", 1), ("abc", 1),
                                           ("1000", 1000), ("1001", 1000), ("1e9", 1000)])
def test_page_parsing(raw, page):
    assert SearchQuery(page=raw).to_filter().page == page

