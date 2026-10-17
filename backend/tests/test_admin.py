import pytest
from fastapi.testclient import TestClient

from app import auth
from app.auth import Actor, optional_user
from app.main import app
from app.modules.admin.domain import AdminError
from app.modules.admin.memory import InMemoryAdminRepository
from app.modules.admin.router import get_admin_service
from app.modules.admin.service import AdminService

ADMIN = "00000000-0000-0000-0000-00000000000a"
USER = "00000000-0000-0000-0000-000000000001"
POSTING = "00000000-0000-0000-0000-000000000002"


def user(user_id, role="CANDIDATE"):
    return {"userId": user_id, "email": f"{user_id}@x.test", "role": role, "displayName": "A", "createdAt": "t",
            "lastSignInAt": None, "lockedAt": None, "lockedReason": None, "phone": None, "postings": 0,
            "applications": 0}


@pytest.fixture
def repo():
    return InMemoryAdminRepository(
        actor_id=ADMIN,
        users={ADMIN: user(ADMIN, "ADMIN"), USER: user(USER)},
        postings={POSTING: {"id": POSTING, "title": "Tin", "hiddenAt": None, "hiddenReason": None}},
        companies={USER: {"id": USER, "name": "Cty", "verifiedAt": None, "companyVerified": False}},
    )


def test_lock_needs_a_5_to_500_char_reason_and_returns_admin_user(repo):
    service = AdminService(repo)
    for bad in (None, "", "   abc  ", "x" * 501):
        with pytest.raises(AdminError) as err:
            service.set_user_lock(USER, True, bad)
        assert err.value.status == 422 and err.value.message == "Lý do cần từ 5 đến 500 ký tự"
    locked = service.set_user_lock(USER, True, "  Spam tin  ")
    assert locked["lockedReason"] == "Spam tin" and locked["lockedAt"]
    assert "phone" not in locked and "postings" not in locked
    unlocked = service.set_user_lock(USER, False, "ignored")
    assert (unlocked["lockedAt"], unlocked["lockedReason"]) == (None, None)
    assert [a["action"] for a in repo.audit] == ["USER_LOCKED", "USER_UNLOCKED"]


def test_lock_drops_the_cached_account(repo, monkeypatch):
    monkeypatch.setattr(auth, "_accounts", {USER: (float("inf"), ("CANDIDATE", None))})
    AdminService(repo).set_user_lock(USER, True, "Vi phạm điều khoản")
    assert USER not in auth._accounts


@pytest.mark.parametrize("target, code", [(ADMIN, "CANNOT_LOCK_SELF"), ("missing", "USER_NOT_FOUND")])
def test_lock_refusals(repo, target, code):
    with pytest.raises(AdminError) as err:
        AdminService(repo).set_user_lock(target, True, "Lý do hợp lệ")
    assert err.value.code == code


def test_hide_needs_reason_unhide_does_not(repo):
    service = AdminService(repo)
    with pytest.raises(AdminError):
        service.set_posting_hidden(POSTING, True, "x")
    assert service.set_posting_hidden(POSTING, True, "Nội dung lừa đảo")["hiddenReason"] == "Nội dung lừa đảo"
    assert service.set_posting_hidden(POSTING, False, None)["hiddenAt"] is None


def test_pages_drop_blank_filters_and_clamp_page(repo):
    page = AdminService(repo).list_users({"q": "  ", "role": None, "locked": None}, 0)
    assert (page["total"], page["page"], page["pageSize"]) == (2, 1, 20)
    assert AdminService(repo).list_users({"role": "ADMIN"}, 1)["total"] == 1


def test_routes_require_admin_and_map_errors(repo):
    app.dependency_overrides[get_admin_service] = lambda: AdminService(repo)
    try:
        client = TestClient(app)
        app.dependency_overrides[optional_user] = lambda: Actor(ADMIN, "ADMIN", {"sub": ADMIN}, "t")
        assert client.get("/admin/users?locked=false").json()["total"] == 2
        assert client.get(f"/admin/users/{USER}").json()["userId"] == USER
        res = client.post(f"/admin/users/{ADMIN}/lock", json={"locked": True, "reason": "Tự khóa mình"})
        assert res.status_code == 409 and res.json() == {"error": "Không thể khóa chính tài khoản của bạn"}
        res = client.post(f"/admin/companies/{USER}/verified", json={"verified": True})
        assert res.json()["companyVerified"] is True
        assert client.get("/admin/audit?action=NOPE").status_code == 422
    finally:
        app.dependency_overrides.clear()

    # The real dependency chain: not ADMIN → 403 before any repository is built.
    for role in ("CANDIDATE", "EMPLOYER"):
        app.dependency_overrides[optional_user] = lambda role=role: Actor(USER, role, {"sub": USER}, "t")
        try:
            res = TestClient(app).get("/admin/stats")
            assert res.status_code == 403 and res.json() == {"error": "Chỉ quản trị viên được thực hiện thao tác này"}
        finally:
            app.dependency_overrides.clear()
    assert TestClient(app).get("/admin/stats").status_code == 401
