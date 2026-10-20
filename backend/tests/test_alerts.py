from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

from app.auth import Actor, optional_user
from app.main import app
from app.modules.alerts.memory import InMemoryAlertRepository
from app.modules.alerts.router import get_alert_repo

ANNA, BINH, EMP = uuid4(), uuid4(), uuid4()
NOW = datetime.now(UTC)


def _posting(title, *, skills=(), industry="OTHER", location="Đà Nẵng", open_=True, age=0):
    return {
        "id": uuid4(), "employer_id": EMP, "title": title, "company_name": "Cty A", "company_logo_url": None,
        "location": location, "employment_type": "FULL_TIME", "salary_min": None, "salary_max": None,
        "application_deadline": NOW + timedelta(days=30), "created_at": NOW - timedelta(days=age),
        "industry": industry, "level": "JUNIOR", "experience_years": 1, "skills": list(skills), "open": open_,
    }


EXCEL = _posting("Kế toán Excel", skills=["Excel", "MISA"], location="Hà Nội")
SAME_INDUSTRY = _posting("Kế toán thuế", industry="ACCOUNTING_FINANCE", age=1)
NEAR = _posting("Lễ tân", location="Quận 1, Hà Nội", age=2)
NOTHING = _posting("Lập trình viên", skills=["Python"])
APPLIED = _posting("Đã nộp", skills=["Excel"], industry="ACCOUNTING_FINANCE", location="Cần Thơ")
CLOSED = _posting("Đã đóng", skills=["excel"], open_=False)
FILTER = {"q": "kế toán", "location": "Hà Nội", "employmentType": "FULL_TIME", "minSalary": 10_000_000}


class Api:
    def __init__(self):
        postings = {p["id"]: dict(p) for p in (EXCEL, SAME_INDUSTRY, NEAR, NOTHING, APPLIED, CLOSED)}
        self.repo = InMemoryAlertRepository(
            postings,
            {ANNA: {"skills": ["excel", "Misa"], "location": "ha noi"}, BINH: {"skills": [], "location": None}},
            {ANNA: {APPLIED["id"]}},
        )
        self.actor: Actor | None = None
        self.http = TestClient(app)

    def as_(self, user_id: UUID | None, role="CANDIDATE"):
        self.actor = Actor(user_id=str(user_id), role=role, claims={"sub": str(user_id)}, token="t") if user_id else None
        return self.http


@pytest.fixture
def api():
    api = Api()
    app.dependency_overrides[get_alert_repo] = lambda: api.repo
    app.dependency_overrides[optional_user] = lambda: api.actor
    yield api
    app.dependency_overrides.clear()


def test_recommendations_score_and_reasons(api):
    res = api.as_(ANNA).get("/me/recommendations")
    assert res.status_code == 200
    body = res.json()
    # Skills 2×3 + location 1 = 7; industry 2; location 1. Applied, closed and score-0 postings are left out.
    assert [p["title"] for p in body] == ["Kế toán Excel", "Kế toán thuế", "Lễ tân"]
    assert body[0]["matchReasons"] == ["Khớp kỹ năng: Excel, MISA", "Địa điểm phù hợp: Hà Nội"]
    assert body[1]["matchReasons"] == ["Cùng ngành với việc bạn đã ứng tuyển"]
    assert body[2]["matchReasons"] == ["Địa điểm phù hợp: Quận 1, Hà Nội"]
    assert {"companyName", "salaryMax", "skills"} <= body[0].keys()


def test_recommendations_empty_for_guest_employer_and_no_profile_match(api):
    assert api.as_(None).get("/me/recommendations").json() == []
    assert api.as_(EMP, "EMPLOYER").get("/me/recommendations").json() == []
    assert api.as_(BINH).get("/me/recommendations").json() == []


def test_recommendations_capped_at_ten(api):
    for i in range(12):
        p = _posting(f"Excel {i}", skills=["Excel"], age=3 + i)
        api.repo.postings[p["id"]] = p
    assert len(api.as_(ANNA).get("/me/recommendations").json()) == 10


def test_create_list_toggle_delete(api):
    http = api.as_(ANNA)
    res = http.post("/me/job-alerts", json={"name": "  Kế toán HN  ", "filter": {**FILTER, "q": " kế toán "}})
    assert res.status_code == 201
    alert = res.json()
    assert (alert["name"], alert["filter"], alert["active"], alert["lastMatchedAt"]) == \
        ("Kế toán HN", FILTER, True, None)
    second = http.post("/me/job-alerts", json={"name": "IT", "filter": {"industry": "IT_SOFTWARE"}}).json()
    assert second["filter"] == {"industry": "IT_SOFTWARE"}  # unset keys are not stored
    assert [a["id"] for a in http.get("/me/job-alerts").json()] == [second["id"], alert["id"]]

    res = http.patch(f"/me/job-alerts/{alert['id']}", json={"active": False})
    assert (res.status_code, res.json()["active"]) == (200, False)
    assert http.delete(f"/me/job-alerts/{alert['id']}").status_code == 200
    assert [a["id"] for a in http.get("/me/job-alerts").json()] == [second["id"]]


def test_limit_five(api):
    http = api.as_(ANNA)
    for i in range(5):
        assert http.post("/me/job-alerts", json={"name": f"A{i}", "filter": {"q": "excel"}}).status_code == 201
    res = http.post("/me/job-alerts", json={"name": "A5", "filter": {"q": "excel"}})
    assert (res.status_code, res.json()["error"]) == (409, "Bạn chỉ tạo được tối đa 5 thông báo việc làm")


@pytest.mark.parametrize("body", [
    {"name": "", "filter": {"q": "x"}},
    {"name": "x" * 101, "filter": {"q": "x"}},
    {"name": "Rỗng", "filter": {}},
    {"name": "Rỗng", "filter": {"q": "   "}},
    {"name": "Lạ", "filter": {"skill": "excel"}},
    {"name": "Sai", "filter": {"employmentType": "REMOTE"}},
    {"name": "Lương", "filter": {"minSalary": 0}},
    {"name": "Lương", "filter": {"minSalary": "5000000"}},
    {"name": "Dài", "filter": {"q": "x" * 101}},
])
def test_invalid_input_is_422(api, body):
    assert api.as_(ANNA).post("/me/job-alerts", json=body).status_code == 422


@pytest.mark.parametrize(("filter_", "error"), [
    ({"location": " "}, "Bộ lọc cần ít nhất 1 điều kiện"),
    ({"minSalary": 0}, "Lương tối thiểu phải lớn hơn 0"),
    ({"minSalary": 1.5}, "Lương tối thiểu phải là số nguyên"),
    ({"q": "x" * 101}, "Từ khóa từ 1 đến 100 ký tự"),
])
def test_error_messages_match_zod(api, filter_, error):
    assert api.as_(ANNA).post("/me/job-alerts", json={"name": "A", "filter": filter_}).json()["error"] == error


def test_only_owner_and_candidates(api):
    alert = api.as_(ANNA).post("/me/job-alerts", json={"name": "A", "filter": {"q": "x"}}).json()
    other = api.as_(BINH)
    assert other.get("/me/job-alerts").json() == []
    assert other.patch(f"/me/job-alerts/{alert['id']}", json={"active": False}).status_code == 404
    assert other.delete(f"/me/job-alerts/{alert['id']}").status_code == 404
    employer = api.as_(EMP, "EMPLOYER")
    assert employer.get("/me/job-alerts").status_code == 403
    assert employer.post("/me/job-alerts", json={"name": "A", "filter": {"q": "x"}}).status_code == 403
    assert api.as_(None).get("/me/job-alerts").status_code == 401
    assert api.as_(ANNA).patch(f"/me/job-alerts/{alert['id']}", json={"active": "no"}).status_code == 422
