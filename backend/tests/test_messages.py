from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

from app.auth import Actor, optional_user
from app.main import app
from app.modules.messages.memory import InMemoryMessageRepository
from app.modules.messages.router import get_message_repo

EMP, OTHER_EMP, ANNA, BINH = uuid4(), uuid4(), uuid4(), uuid4()
APP, HIRED_APP, QUIET_HIRED_APP = uuid4(), uuid4(), uuid4()


class Api:
    def __init__(self):
        self.repo = InMemoryMessageRepository(
            {APP: (ANNA, EMP, "REVIEWING"), HIRED_APP: (BINH, EMP, "HIRED"), QUIET_HIRED_APP: (ANNA, EMP, "HIRED")}
        )
        self.actor: Actor | None = None
        self.http = TestClient(app)

    def as_(self, user_id: UUID, role="EMPLOYER"):
        self.actor = Actor(user_id=str(user_id), role=role, claims={"sub": str(user_id)}, token="t")
        return self

    def send(self, body="Chào bạn", application=APP, who=EMP, role="EMPLOYER"):
        return self.as_(who, role).http.post(f"/applications/{application}/messages", json={"body": body})


@pytest.fixture
def api():
    api = Api()
    app.dependency_overrides[get_message_repo] = lambda: api.repo
    app.dependency_overrides[optional_user] = lambda: api.actor
    yield api
    app.dependency_overrides.clear()


def test_send_returns_trimmed_message_marked_mine(api):
    res = api.send("  Mời bạn phỏng vấn  ")
    assert res.status_code == 201
    body = res.json()
    assert (body["body"], body["mine"], body["readAt"]) == ("Mời bạn phỏng vấn", True, None)
    assert (body["applicationId"], body["senderId"]) == (str(APP), str(EMP))
    assert api.send("Dạ vâng", who=ANNA, role="CANDIDATE").status_code == 201


@pytest.mark.parametrize("body", ["", "   ", "x" * 2001, 5])
def test_send_rejects_bad_body(api, body):
    res = api.send(body)
    assert res.status_code == 422
    assert res.json() == {"error": "Tin nhắn từ 1 đến 2000 ký tự"}


def test_send_refusals(api):
    assert api.send(who=OTHER_EMP).status_code == 404
    assert api.send(who=BINH, role="CANDIDATE").status_code == 404
    res = api.send(application=HIRED_APP)
    assert res.status_code == 409
    assert res.json() == {"error": "Hồ sơ đã kết thúc, không thể gửi tin nhắn"}
    api.actor = None
    assert api.http.post(f"/applications/{APP}/messages", json={"body": "x"}).status_code == 401


def test_rate_limit_30_per_minute_per_sender(api):
    for _ in range(30):
        assert api.send().status_code == 201
    res = api.send()
    assert res.status_code == 429
    assert res.json() == {"error": "Bạn gửi tin quá nhanh, vui lòng thử lại sau ít phút"}
    assert api.send(who=ANNA, role="CANDIDATE").status_code == 201  # per sender
    api.repo.rows = [m.model_copy(update={"created_at": m.created_at - timedelta(minutes=2)}) for m in api.repo.rows]
    assert api.send().status_code == 201


def test_unread_and_mark_read(api):
    api.send("1")
    api.send("2")
    api.send("Dạ", who=ANNA, role="CANDIDATE")
    assert api.as_(ANNA, "CANDIDATE").http.get("/me/messages/unread-count").json() == 2
    assert api.as_(EMP).http.get("/me/messages/unread-count").json() == 1
    assert api.as_(OTHER_EMP).http.post(f"/applications/{APP}/messages/read").status_code == 404
    res = api.as_(ANNA, "CANDIDATE").http.post(f"/applications/{APP}/messages/read")
    assert res.status_code == 200
    assert api.as_(ANNA, "CANDIDATE").http.get("/me/messages/unread-count").json() == 0
    assert api.as_(EMP).http.get("/me/messages/unread-count").json() == 1  # own read does not touch the other side
    api.actor = None
    assert api.http.get("/me/messages/unread-count").json() == 0


def test_conversations_list_open_or_with_messages_latest_first(api):
    api.send("Chào Bình", application=APP)
    api.repo.rows.append(api.repo.rows[0].model_copy(update={
        "id": uuid4(), "application_id": HIRED_APP, "body": "Chúc mừng", "created_at": datetime.now(UTC)}))
    emp = api.as_(EMP).http.get("/me/conversations").json()
    assert [c["applicationId"] for c in emp] == [str(HIRED_APP), str(APP)]  # QUIET_HIRED_APP: closed, no messages
    assert (emp[0]["canSend"], emp[0]["lastMessage"], emp[1]["canSend"]) == (False, "Chúc mừng", True)
    anna = api.as_(ANNA, "CANDIDATE").http.get("/me/conversations").json()
    assert [(c["applicationId"], c["unread"], c["otherPartyName"]) for c in anna] == [(str(APP), 1, "ACME")]
    assert api.as_(OTHER_EMP).http.get("/me/conversations").json() == []


def test_get_conversation_pages_oldest_first(api):
    t0 = datetime.now(UTC) - timedelta(hours=1)
    for i in range(55):
        assert api.send(f"m{i}").status_code == 201
        api.repo.rows[-1] = api.repo.rows[-1].model_copy(update={"created_at": t0 + timedelta(seconds=i)})
    url = f"/applications/{APP}/messages"
    first = api.as_(ANNA, "CANDIDATE").http.get(url).json()
    assert [m["body"] for m in first["messages"]] == [f"m{i}" for i in range(5, 55)]
    assert first["hasMore"] is True
    assert first["messages"][0]["mine"] is False
    assert first["conversation"]["applicationId"] == str(APP)
    older = api.http.get(url, params={"before": first["messages"][0]["createdAt"]}).json()
    assert ([m["body"] for m in older["messages"]], older["hasMore"]) == ([f"m{i}" for i in range(5)], False)
    assert api.as_(OTHER_EMP).http.get(url).status_code == 404
    assert api.as_(BINH, "CANDIDATE").http.get(url).status_code == 404
    assert api.as_(EMP).http.get(url, params={"before": "hôm qua"}).status_code == 422
    closed = api.as_(EMP).http.get(f"/applications/{QUIET_HIRED_APP}/messages").json()
    assert (closed["messages"], closed["conversation"]["canSend"]) == ([], False)
