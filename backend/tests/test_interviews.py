from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

from app.auth import Actor, optional_user
from app.main import app
from app.modules.interviews.memory import InMemoryInterviewRepository
from app.modules.interviews.router import get_interview_repo

EMP, OTHER_EMP, ANNA, BINH = uuid4(), uuid4(), uuid4(), uuid4()
APP, REJECTED_APP = uuid4(), uuid4()


def _at(**delta) -> str:
    return (datetime.now(UTC) + timedelta(**delta)).isoformat()


class Api:
    def __init__(self):
        self.repo = InMemoryInterviewRepository(
            {APP: (ANNA, EMP, uuid4(), "REVIEWING"), REJECTED_APP: (BINH, EMP, uuid4(), "REJECTED")}
        )
        self.actor: Actor | None = None
        self.http = TestClient(app)

    def as_(self, user_id: UUID, role="EMPLOYER"):
        self.actor = Actor(user_id=str(user_id), role=role, claims={"sub": str(user_id)}, token="t")
        return self

    def schedule(self, application=APP, **body):
        body = {"scheduledAt": _at(days=1), "durationMinutes": 60, "mode": "ONLINE",
                "location": "https://meet.example/abc"} | body
        return self.http.post(f"/applications/{application}/interviews", json=body)

    def scheduled(self) -> str:
        return self.as_(EMP).schedule().json()["id"]

    def respond(self, interview: str, response="CONFIRM", note=None, who=ANNA):
        return self.as_(who, "CANDIDATE").http.post(f"/interviews/{interview}/respond",
                                                    json={"response": response, "note": note})


@pytest.fixture
def api():
    api = Api()
    app.dependency_overrides[get_interview_repo] = lambda: api.repo
    app.dependency_overrides[optional_user] = lambda: api.actor
    yield api
    app.dependency_overrides.clear()


def test_schedule_returns_interview_and_moves_application_to_interviewing(api):
    res = api.as_(EMP).schedule(note="  Mang laptop  ", location=" https://meet.example/abc ")
    assert res.status_code == 201
    body = res.json()
    assert body["status"] == "PROPOSED"
    assert body["applicationId"] == str(APP)
    assert body["note"] == "Mang laptop"
    assert body["location"] == "https://meet.example/abc"
    assert body["candidateNote"] is None
    assert {"postingId", "postingTitle", "companyName", "candidateName", "durationMinutes"} <= body.keys()
    assert api.repo.applications[APP][3] == "INTERVIEWING"


@pytest.mark.parametrize(("body", "error"), [
    ({"durationMinutes": 10}, "Thời lượng phải từ 15 đến 240 phút"),
    ({"durationMinutes": 241}, "Thời lượng phải từ 15 đến 240 phút"),
    ({"durationMinutes": 30.5}, "Thời lượng phải từ 15 đến 240 phút"),
    ({"location": "meet.example/abc"}, "Link phỏng vấn phải là URL http(s)"),
    ({"location": "https://x y"}, "Link phỏng vấn phải là URL http(s)"),
    ({"mode": "ONSITE", "location": " Q1 "}, "Địa chỉ phỏng vấn từ 5 đến 300 ký tự"),
    ({"mode": "ONSITE", "location": "x" * 301}, "Địa chỉ phỏng vấn từ 5 đến 300 ký tự"),
    ({"note": "x" * 1001}, "Ghi chú tối đa 1000 ký tự"),
    ({"scheduledAt": "2030-01-01T09:00:00"}, "Giờ phỏng vấn không hợp lệ"),
    ({"scheduledAt": "ngày mai"}, "Giờ phỏng vấn không hợp lệ"),
    ({"scheduledAt": _at(minutes=-1)}, "Giờ phỏng vấn phải ở tương lai và trong vòng 90 ngày"),
    ({"scheduledAt": _at(days=91)}, "Giờ phỏng vấn phải ở tương lai và trong vòng 90 ngày"),
])
def test_schedule_rejects_bad_input(api, body, error):
    res = api.as_(EMP).schedule(**body)
    assert res.status_code == 422
    assert res.json() == {"error": error}


def test_onsite_address_is_trimmed(api):
    assert api.as_(EMP).schedule(mode="ONSITE", location="  12 Lê Lợi, Q1  ").json()["location"] == "12 Lê Lợi, Q1"


def test_schedule_refusals(api):
    assert api.as_(OTHER_EMP).schedule().status_code == 404
    assert api.as_(ANNA, "CANDIDATE").schedule().status_code == 403
    assert api.as_(EMP).schedule(REJECTED_APP).json() == {
        "error": "Chỉ đặt lịch phỏng vấn cho hồ sơ đang xem xét hoặc đang phỏng vấn"}
    assert api.as_(EMP).schedule().status_code == 201
    res = api.as_(EMP).schedule()
    assert res.status_code == 409
    assert res.json() == {"error": "Hồ sơ đã có lịch phỏng vấn đang chờ hoặc đã xác nhận"}


def test_candidate_responds_once(api):
    interview = api.scheduled()
    assert api.respond(interview, who=BINH).status_code == 404
    assert api.as_(EMP).http.post(f"/interviews/{interview}/respond", json={"response": "CONFIRM"}).status_code == 403
    assert api.respond(interview, "RESCHEDULE", "  ").json() == {"error": "Vui lòng ghi chú giờ bạn muốn đổi"}
    assert api.respond(interview, "RESCHEDULE", "x" * 501).json() == {"error": "Ghi chú tối đa 500 ký tự"}
    assert api.respond(interview, "MAYBE").status_code == 422
    res = api.respond(interview, "RESCHEDULE", " Chiều thứ 6 ")
    assert res.status_code == 200
    assert (res.json()["status"], res.json()["candidateNote"]) == ("RESCHEDULE_REQUESTED", "Chiều thứ 6")
    assert api.respond(interview).status_code == 409
    # The reschedule request frees the slot for a new proposal.
    assert api.as_(EMP).schedule().status_code == 201


@pytest.mark.parametrize(("response", "status"), [("CONFIRM", "CONFIRMED"), ("DECLINE", "DECLINED")])
def test_confirm_or_decline(api, response, status):
    assert api.respond(api.scheduled(), response).json()["status"] == status


def test_cancel(api):
    interview = api.scheduled()
    cancel = f"/interviews/{interview}/cancel"
    assert api.as_(OTHER_EMP).http.post(cancel, json={}).status_code == 404
    assert api.as_(ANNA, "CANDIDATE").http.post(cancel, json={}).status_code == 403
    assert api.as_(EMP).http.post(cancel, json={"reason": "x" * 501}).json() == {"error": "Lý do hủy tối đa 500 ký tự"}
    assert api.as_(EMP).http.post(cancel, json={"reason": "Đã tuyển đủ"}).json()["status"] == "CANCELLED"
    assert api.as_(EMP).http.post(cancel, json={}).status_code == 409


def test_done_only_when_confirmed_and_due(api):
    interview = api.scheduled()
    done = f"/interviews/{interview}/done"
    assert api.as_(EMP).http.post(done).status_code == 409  # PROPOSED
    api.respond(interview)
    assert api.as_(EMP).http.post(done).json() == {"error": "Chỉ đánh dấu đã phỏng vấn sau giờ hẹn"}
    api.repo.move(UUID(interview), datetime.now(UTC) - timedelta(hours=1))
    assert api.as_(OTHER_EMP).http.post(done).status_code == 404
    assert api.as_(EMP).http.post(done).json()["status"] == "DONE"


def test_list_mine_by_scope_and_role(api):
    soon = api.scheduled()
    api.respond(soon, "DECLINE")
    later = api.as_(EMP).schedule(scheduledAt=_at(days=5)).json()["id"]
    api.respond(later, "DECLINE")
    api.repo.move(UUID(soon), datetime.now(UTC) + timedelta(days=2))
    old = api.as_(EMP).schedule(scheduledAt=_at(days=1)).json()["id"]
    api.repo.move(UUID(old), datetime.now(UTC) - timedelta(days=3))

    def ids(who, role, scope=None):
        res = api.as_(who, role).http.get("/me/interviews", params={"scope": scope} if scope else None)
        assert res.status_code == 200
        return [i["id"] for i in res.json()]

    assert ids(EMP, "EMPLOYER") == [soon, later]
    assert ids(ANNA, "CANDIDATE", "upcoming") == [soon, later]
    assert ids(ANNA, "CANDIDATE", "past") == [old]
    assert ids(OTHER_EMP, "EMPLOYER") == []
    assert ids(BINH, "CANDIDATE", "past") == []
    assert api.as_(EMP).http.get("/me/interviews", params={"scope": "all"}).status_code == 422
    api.actor = None
    assert api.http.get("/me/interviews").status_code == 401


def test_list_for_application(api):
    interview = api.scheduled()
    url = f"/applications/{APP}/interviews"
    assert [i["id"] for i in api.as_(EMP).http.get(url).json()] == [interview]
    assert [i["id"] for i in api.as_(ANNA, "CANDIDATE").http.get(url).json()] == [interview]
    assert api.as_(OTHER_EMP).http.get(url).status_code == 404
    assert api.as_(BINH, "CANDIDATE").http.get(url).status_code == 404
    assert api.as_(EMP).http.get(f"/applications/{REJECTED_APP}/interviews").json() == []
