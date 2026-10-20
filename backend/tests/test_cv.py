from datetime import UTC, datetime
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

from app.auth import Actor, optional_user
from app.main import app
from app.modules.cv.memory import InMemoryCvRepository
from app.modules.cv.router import get_cv_repo
from app.modules.cv.schemas import OnlineCv

EMP, OTHER_EMP, ANNA = uuid4(), uuid4(), uuid4()
ONLINE_APP, FILE_APP = uuid4(), uuid4()

CV = {
    "template": "MODERN",
    "fullName": "  Nguyễn Anna  ",
    "headline": "Kế toán tổng hợp",
    "email": "anna@example.vn",
    "phone": "",
    "location": None,
    "summary": "5 năm kinh nghiệm.",
    "experiences": [{"title": "Kế toán", "organization": "ACME", "startDate": "2020-01", "endDate": None,
                     "description": ""}],
    "educations": [{"title": "Kế toán", "organization": "ĐH Kinh tế", "startDate": "2015-09", "endDate": "2019-06",
                    "description": "Tốt nghiệp loại giỏi"}],
    "skills": ["Excel", "MISA"],
    "languages": ["Tiếng Anh"],
    "certifications": [{"name": "ACCA", "issuer": None, "year": 2022}],
}


class Api:
    def __init__(self):
        snapshot = OnlineCv.model_validate({**CV, "candidateId": str(ANNA), "updatedAt": datetime.now(UTC)})
        self.repo = InMemoryCvRepository({ONLINE_APP: (EMP, snapshot), FILE_APP: (EMP, None)})
        self.actor: Actor | None = None
        self.http = TestClient(app)

    def as_(self, user_id: UUID, role="CANDIDATE"):
        self.actor = Actor(user_id=str(user_id), role=role, claims={"sub": str(user_id)}, token="t")
        return self.http


@pytest.fixture
def api():
    api = Api()
    app.dependency_overrides[get_cv_repo] = lambda: api.repo
    app.dependency_overrides[optional_user] = lambda: api.actor
    yield api
    app.dependency_overrides.clear()


def test_save_get_delete_own_cv(api):
    http = api.as_(ANNA)
    assert http.get("/me/cv").json() is None
    res = http.put("/me/cv", json=CV)
    assert res.status_code == 200
    body = res.json()
    assert (body["candidateId"], body["fullName"], body["phone"], body["location"]) == (str(ANNA), "Nguyễn Anna", None, None)
    assert body["experiences"][0] == {"title": "Kế toán", "organization": "ACME", "startDate": "2020-01",
                                      "endDate": None, "description": ""}
    assert http.put("/me/cv", json={**CV, "template": "CLASSIC"}).json()["template"] == "CLASSIC"
    assert http.get("/me/cv").json()["template"] == "CLASSIC"
    assert http.delete("/me/cv").status_code == 200
    assert http.get("/me/cv").json() is None


@pytest.mark.parametrize(
    ("patch", "error"),
    [
        ({"template": "FANCY"}, "Giá trị của template không hợp lệ"),
        ({"fullName": "  "}, "Họ tên từ 1 đến 100 ký tự"),
        ({"email": "anna"}, "Email không hợp lệ"),
        ({"phone": "12ab"}, "Số điện thoại không hợp lệ"),
        ({"summary": "x" * 2001}, "Giới thiệu từ 1 đến 2000 ký tự"),
        ({"skills": ["x"] * 31}, "Tối đa 30 kỹ năng"),
        ({"skills": ["x" * 31]}, "Kỹ năng từ 1 đến 30 ký tự"),
        ({"languages": ["Anh"] * 11}, "Tối đa 10 ngoại ngữ"),
        ({"experiences": [CV["experiences"][0]] * 16}, "Tối đa 15 kinh nghiệm"),
        ({"educations": [{**CV["educations"][0], "startDate": "2015-13"}]}, "Tháng bắt đầu không hợp lệ"),
        ({"experiences": [{**CV["experiences"][0], "organization": "x" * 151}]}, "Tên công ty / trường từ 1 đến 150 ký tự"),
        ({"experiences": [{**CV["experiences"][0], "description": "x" * 2001}]}, "Mô tả tối đa 2000 ký tự"),
        ({"certifications": [{"name": "ACCA", "year": 1800}]}, "Năm cấp không hợp lệ"),
    ],
)
def test_save_rejects_out_of_contract_input(api, patch, error):
    res = api.as_(ANNA).put("/me/cv", json={**CV, **patch})
    assert (res.status_code, res.json()) == (422, {"error": error})


def test_employer_reads_only_snapshots_on_own_postings(api):
    http = api.as_(EMP, "EMPLOYER")
    assert http.get(f"/applications/{ONLINE_APP}/cv").json()["fullName"] == "Nguyễn Anna"
    assert http.get(f"/applications/{FILE_APP}/cv").json() is None
    assert api.as_(OTHER_EMP, "EMPLOYER").get(f"/applications/{ONLINE_APP}/cv").status_code == 404


def test_wrong_role_is_refused(api):
    assert api.as_(EMP, "EMPLOYER").put("/me/cv", json=CV).status_code == 403
    assert api.as_(EMP, "EMPLOYER").get("/me/cv").status_code == 403
    assert api.as_(ANNA).get(f"/applications/{ONLINE_APP}/cv").status_code == 403
    api.actor = None
    assert api.http.get("/me/cv").status_code == 401
