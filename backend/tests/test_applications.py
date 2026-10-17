from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

from app.auth import Actor, optional_user
from app.main import app
from app.modules.applications.domain import MAX_RESUME_BYTES, allowed_next_statuses
from app.modules.applications.memory import InMemoryApplicationRepository
from app.modules.applications.router import get_application_repo, get_resume_storage

EMP, OTHER_EMP, ANNA, BINH = uuid4(), uuid4(), uuid4(), uuid4()
OPEN, CLOSED = uuid4(), uuid4()
PDF = b"%PDF-1.7 ..."


class FakeStorage:
    def __init__(self):
        self.files: dict[str, bytes] = {}
        self.fail_remove = False

    def upload(self, path: str, content: bytes) -> None:
        self.files[path] = content

    def remove(self, path: str) -> None:
        if self.fail_remove:
            raise RuntimeError("storage down")
        self.files.pop(path, None)

    def signed_url(self, path: str, expires_in: int) -> str:
        return f"https://storage.test/{path}?ttl={expires_in}"


class Api:
    def __init__(self):
        self.repo = InMemoryApplicationRepository({OPEN: (EMP, "Kế toán", True), CLOSED: (EMP, "Đã đóng", False)})
        self.storage = FakeStorage()
        self.actor: Actor | None = None
        self.http = TestClient(app)

    def as_(self, user_id: UUID, role="CANDIDATE"):
        self.actor = Actor(user_id=str(user_id), role=role, claims={"sub": str(user_id)}, token="t")
        return self

    def submit(self, posting=OPEN, content=PDF, mime="application/pdf"):
        files = {"resume": ("cv.pdf", content, mime)} if content is not None else None
        return self.http.post("/applications", data={"postingId": str(posting)}, files=files)

    def applied(self, user_id=ANNA) -> str:
        return self.as_(user_id).submit().json()["id"]


@pytest.fixture
def api():
    api = Api()
    app.dependency_overrides[get_application_repo] = lambda: api.repo
    app.dependency_overrides[get_resume_storage] = lambda: api.storage
    app.dependency_overrides[optional_user] = lambda: api.actor
    yield api
    app.dependency_overrides.clear()


@pytest.mark.parametrize(
    ("status", "role", "expected"),
    [
        ("SUBMITTED", "EMPLOYER", ["REVIEWING", "REJECTED"]),
        ("SUBMITTED", "CANDIDATE", ["WITHDRAWN"]),
        ("OFFERED", "EMPLOYER", ["HIRED", "REJECTED"]),
        ("HIRED", "CANDIDATE", []),
        ("REJECTED", "EMPLOYER", []),
    ],
)
def test_allowed_next_statuses(status, role, expected):
    assert allowed_next_statuses(status, role) == expected


def test_submit_uploads_to_candidate_folder_and_records_history(api):
    res = api.as_(ANNA).submit()
    assert res.status_code == 201
    body = res.json()
    assert (body["jobPostingId"], body["candidateId"], body["status"]) == (str(OPEN), str(ANNA), "SUBMITTED")
    [path] = api.storage.files
    assert path.startswith(f"{ANNA}/") and path.endswith(".pdf")
    detail = api.http.get(f"/me/applications/{body['id']}").json()
    assert detail["postingTitle"] == "Kế toán"
    assert [(h["fromStatus"], h["toStatus"], h["changedByRole"]) for h in detail["history"]] == [
        (None, "SUBMITTED", "CANDIDATE")
    ]


@pytest.mark.parametrize(
    ("content", "mime", "error"),
    [
        (None, "application/pdf", "Vui lòng chọn file CV"),
        (b"", "application/pdf", "Vui lòng chọn file CV"),
        (PDF, "image/png", "CV phải là file PDF"),
        (b"MZ...", "application/pdf", "CV phải là file PDF"),
        (b"%" * (MAX_RESUME_BYTES + 1), "application/pdf", "CV tối đa 5 MB"),
    ],
)
def test_submit_rejects_bad_resume_before_upload(api, content, mime, error):
    res = api.as_(ANNA).submit(content=content, mime=mime)
    assert (res.status_code, res.json()) == (422, {"error": error})
    assert api.storage.files == {}


def test_submit_bad_posting_id(api):
    res = api.as_(ANNA).submit(posting="1")
    assert (res.status_code, res.json()) == (422, {"error": "Mã tin không hợp lệ"})


@pytest.mark.parametrize("fail_remove", [False, True])
def test_refused_submit_removes_orphan_upload(api, fail_remove):
    api.applied()
    api.storage.fail_remove = fail_remove
    res = api.submit()
    assert (res.status_code, res.json()) == (409, {"error": "Bạn đã nộp hồ sơ cho tin này rồi"})
    assert len(api.storage.files) == (2 if fail_remove else 1)  # cleanup failure keeps the refusal message


def test_submit_closed_posting(api):
    res = api.as_(ANNA).submit(posting=CLOSED)
    assert (res.status_code, res.json()) == (409, {"error": "Tin tuyển dụng không còn nhận hồ sơ"})
    assert api.storage.files == {}


def test_submit_requires_candidate(api):
    assert api.as_(EMP, "EMPLOYER").submit().status_code == 403
    api.actor = None
    assert api.submit().status_code == 401


def test_my_application_for_posting(api):
    assert api.as_(ANNA).http.get(f"/postings/{OPEN}/my-application").json() is None
    app_id = api.applied()
    assert api.http.get(f"/postings/{OPEN}/my-application").json()["id"] == app_id
    assert [a["id"] for a in api.http.get("/me/applications").json()] == [app_id]
    assert api.as_(BINH).http.get("/me/applications").json() == []
    assert api.http.get(f"/me/applications/{app_id}").status_code == 404


def test_employer_moves_forward_but_never_withdraws(api):
    app_id = api.applied()
    api.as_(EMP, "EMPLOYER")
    for to in ("REVIEWING", "INTERVIEWING", "OFFERED"):
        assert api.http.post(f"/applications/{app_id}/status", json={"toStatus": to}).json()["status"] == to
    res = api.http.post(f"/applications/{app_id}/status", json={"toStatus": "WITHDRAWN"})
    assert (res.status_code, res.json()) == (409, {"error": "Hồ sơ không thể chuyển sang trạng thái này"})
    res = api.http.post(f"/applications/{app_id}/status", json={"toStatus": "SUBMITTED"})
    assert res.status_code == 409


def test_other_employer_sees_nothing(api):
    app_id = api.applied()
    api.as_(OTHER_EMP, "EMPLOYER")
    res = api.http.post(f"/applications/{app_id}/status", json={"toStatus": "REVIEWING"})
    assert (res.status_code, res.json()) == (404, {"error": "Không tìm thấy hồ sơ"})
    assert api.http.get(f"/me/postings/{OPEN}/applications").status_code == 404
    assert api.http.get(f"/applications/{app_id}/resume-url").status_code == 404


def test_candidate_withdraws_once_and_only_own(api):
    app_id = api.applied()
    assert api.as_(BINH).http.post(f"/me/applications/{app_id}/withdraw").status_code == 404
    res = api.as_(ANNA).http.post(f"/me/applications/{app_id}/withdraw")
    assert res.json()["status"] == "WITHDRAWN"
    assert api.http.post(f"/me/applications/{app_id}/withdraw").status_code == 409
    assert api.as_(ANNA).http.post(f"/applications/{app_id}/status", json={"toStatus": "REVIEWING"}).status_code == 403


def test_employer_lists_and_gets_resume_url(api):
    app_id = api.applied()
    api.as_(EMP, "EMPLOYER")
    [row] = api.http.get(f"/me/postings/{OPEN}/applications").json()
    assert (row["id"], row["candidateSkills"]) == (app_id, [])
    body = api.http.get(f"/applications/{app_id}/resume-url").json()
    [path] = api.storage.files
    assert body == {"url": f"https://storage.test/{path}?ttl=60", "expiresInSeconds": 60}
