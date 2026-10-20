import json
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

from app.auth import Actor, optional_user
from app.main import app
from app.modules.talent.memory import InMemoryTalentRepository
from app.modules.talent.router import get_talent_repo

EMP, OTHER_EMP = uuid4(), uuid4()
ANNA, BINH, OFF, LOCKED = uuid4(), uuid4(), uuid4(), uuid4()
POSTING, OTHER_POSTING, CLOSED_POSTING = uuid4(), uuid4(), uuid4()
NOW = datetime.now(UTC)

CV = {
    "candidate_id": ANNA, "updated_at": NOW, "template": "MODERN", "full_name": "Nguyễn Anna",
    "headline": "Kế toán", "location": None, "summary": None, "experiences": [], "educations": [],
    "skills": ["Excel"], "languages": [], "certifications": [],
}


def _candidate(cid, name, *, skills=(), location=None, years=None, open_to_work=True, locked=False, cv=None, age=0):
    return {
        "candidate_id": cid, "full_name": name, "headline": None, "skills": list(skills), "location": location,
        "experience_years": years, "experience": None, "education": None, "open_to_work": open_to_work,
        "locked": locked, "cv": cv, "updated_at": NOW - timedelta(days=age),
        "email": f"{cid}@secret.vn", "phone": "0901234567",
    }


class Api:
    def __init__(self):
        self.repo = InMemoryTalentRepository(
            {
                ANNA: _candidate(ANNA, "Nguyễn Anna", skills=["Kế toán", "Excel"], location="Hà Nội", years=5, cv=CV),
                BINH: _candidate(BINH, "Trần Bình", skills=["Python"], location="TP. Hồ Chí Minh", years=1, age=1),
                OFF: _candidate(OFF, "Tắt Tìm Việc", skills=["Excel"], open_to_work=False),
                LOCKED: _candidate(LOCKED, "Bị Khóa", skills=["Excel"], locked=True),
            },
            {POSTING: (EMP, True), OTHER_POSTING: (OTHER_EMP, True), CLOSED_POSTING: (EMP, False)},
        )
        self.actor: Actor | None = None
        self.http = TestClient(app)

    def as_(self, user_id: UUID, role="EMPLOYER"):
        self.actor = Actor(user_id=str(user_id), role=role, claims={"sub": str(user_id)}, token="t")
        return self.http


@pytest.fixture
def api():
    api = Api()
    app.dependency_overrides[get_talent_repo] = lambda: api.repo
    app.dependency_overrides[optional_user] = lambda: api.actor
    yield api
    app.dependency_overrides.clear()


def _no_contact(body) -> None:
    text = json.dumps(body)
    assert "secret.vn" not in text and "0901234567" not in text
    assert '"email"' not in text and '"phone"' not in text


def _ids(res) -> list[str]:
    return [t["candidateId"] for t in res.json()["items"]]


def test_search_shows_only_open_to_work_unlocked_without_contact(api):
    res = api.as_(EMP).get("/talent")
    assert res.status_code == 200
    assert (_ids(res), res.json()["total"], res.json()["pageSize"]) == ([str(ANNA), str(BINH)], 2, 20)
    assert res.json()["items"][0]["hasOnlineCv"] is True and res.json()["items"][1]["hasOnlineCv"] is False
    _no_contact(res.json())


@pytest.mark.parametrize(
    ("query", "expected"),
    [
        ({"q": "nguyen"}, [ANNA]),  # accent-insensitive, like posting search
        ({"q": "KE TOAN"}, [ANNA]),
        ({"skill": "python"}, [BINH]),
        ({"skill": "Exc"}, []),  # skill is an exact (folded) match
        ({"location": "ho chi minh"}, [BINH]),
        ({"minExperience": 2}, [ANNA]),
        ({"page": 2}, []),
    ],
)
def test_search_filters(api, query, expected):
    assert _ids(api.as_(EMP).get("/talent", params=query)) == [str(c) for c in expected]


def test_detail_without_contact_and_hidden_when_off_or_locked(api):
    http = api.as_(EMP)
    body = http.get(f"/talent/{ANNA}").json()
    assert (body["profile"]["userId"], body["profile"]["openToWork"], body["cv"]["fullName"]) == \
        (str(ANNA), True, "Nguyễn Anna")
    _no_contact(body)
    assert http.get(f"/talent/{BINH}").json()["cv"] is None
    for hidden in (OFF, LOCKED, uuid4()):
        assert http.get(f"/talent/{hidden}").status_code == 404


def test_candidate_turning_off_disappears(api):
    http = api.as_(ANNA, "CANDIDATE")
    res = http.post("/me/open-to-work", json={"openToWork": False})
    assert res.json() == {"openToWork": False}
    assert api.repo.candidates[ANNA]["location"] == "Hà Nội"  # omitted fields stay
    assert _ids(api.as_(EMP).get("/talent")) == [str(BINH)]
    assert api.as_(EMP).get(f"/talent/{ANNA}").status_code == 404
    api.as_(OFF, "CANDIDATE").post("/me/open-to-work", json={"openToWork": True, "location": " Đà Nẵng ",
                                                              "experienceYears": 3})
    assert (api.repo.candidates[OFF]["location"], api.repo.candidates[OFF]["experience_years"]) == ("Đà Nẵng", 3)
    assert str(OFF) in _ids(api.as_(EMP).get("/talent"))


@pytest.mark.parametrize(
    ("body", "error"),
    [
        ({"openToWork": True, "location": "x" * 151}, "Địa điểm từ 1 đến 150 ký tự"),
        ({"openToWork": True, "experienceYears": 51}, "Số năm kinh nghiệm từ 0 đến 50"),
        ({"openToWork": True, "experienceYears": -1}, "Số năm kinh nghiệm từ 0 đến 50"),
        ({"openToWork": True, "experienceYears": 2.5}, "Số năm kinh nghiệm từ 0 đến 50"),
        ({"location": "Hà Nội"}, None),
        ({"openToWork": True, "email": "x@y.vn"}, None),
    ],
)
def test_open_to_work_rejects_out_of_contract_input(api, body, error):
    res = api.as_(ANNA, "CANDIDATE").post("/me/open-to-work", json=body)
    assert res.status_code == 422
    if error:
        assert res.json() == {"error": error}


def test_save_toggle_and_saved_list(api):
    http = api.as_(EMP)
    assert http.post(f"/talent/{ANNA}/save", json={"note": "Hợp vị trí kế toán"}).json() == {"saved": True}
    assert http.post(f"/talent/{BINH}/save").json() == {"saved": True}
    assert [t["candidateId"] for t in http.get("/me/saved-talent").json()] == [str(BINH), str(ANNA)]
    assert http.get(f"/talent/{ANNA}").json()["saved"] is True
    assert api.as_(OTHER_EMP).get(f"/talent/{ANNA}").json()["saved"] is False
    assert api.as_(OTHER_EMP).get("/me/saved-talent").json() == []
    _no_contact(api.as_(EMP).get("/me/saved-talent").json())

    api.repo.candidates[BINH]["open_to_work"] = False  # saved but no longer visible → left out
    assert [t["candidateId"] for t in api.as_(EMP).get("/me/saved-talent").json()] == [str(ANNA)]
    assert api.as_(EMP).post(f"/talent/{ANNA}/save").json() == {"saved": False}
    assert api.as_(EMP).post(f"/talent/{OFF}/save").status_code == 404
    assert api.as_(EMP).post(f"/talent/{ANNA}/save", json={"note": "x" * 501}).status_code == 422


def test_invite_rules(api):
    http = api.as_(EMP)
    assert http.post(f"/talent/{ANNA}/invite", json={"postingId": str(POSTING), "message": "Mời bạn"}).status_code == 200
    assert api.repo.notifications == [(ANNA, "TALENT_INVITED", f"/jobs/{POSTING}")]
    res = http.post(f"/talent/{ANNA}/invite", json={"postingId": str(POSTING)})
    assert (res.status_code, res.json()) == (409, {"error": "Bạn đã mời ứng viên này vào tin này"})
    for posting in (OTHER_POSTING, CLOSED_POSTING, uuid4()):
        assert http.post(f"/talent/{BINH}/invite", json={"postingId": str(posting)}).status_code == 422
    assert http.post(f"/talent/{OFF}/invite", json={"postingId": str(POSTING)}).status_code == 404
    assert http.post(f"/talent/{BINH}/invite", json={"postingId": str(POSTING), "message": "x" * 1001}).status_code == 422


def test_invite_limit_20_per_24_hours(api):
    old = datetime.now(UTC) - timedelta(hours=25)
    api.repo.invitations = [(EMP, uuid4(), uuid4(), old)] + [(EMP, uuid4(), uuid4(), datetime.now(UTC))] * 19
    http = api.as_(EMP)
    assert http.post(f"/talent/{ANNA}/invite", json={"postingId": str(POSTING)}).status_code == 200
    res = http.post(f"/talent/{BINH}/invite", json={"postingId": str(POSTING)})
    assert res.status_code == 429


def test_wrong_role_is_refused(api):
    cand = api.as_(ANNA, "CANDIDATE")
    assert cand.get("/talent").status_code == 403
    assert cand.get(f"/talent/{BINH}").status_code == 403
    assert cand.post(f"/talent/{BINH}/save").status_code == 403
    assert cand.get("/me/saved-talent").status_code == 403
    assert cand.post(f"/talent/{BINH}/invite", json={"postingId": str(POSTING)}).status_code == 403
    assert api.as_(EMP).post("/me/open-to-work", json={"openToWork": True}).status_code == 403
    api.actor = None
    assert api.http.get("/talent").status_code == 401
