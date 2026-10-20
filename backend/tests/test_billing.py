from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from app.auth import Actor, optional_user
from app.main import app
from app.modules.billing import router as billing_router
from app.modules.billing.domain import BillingError
from app.modules.billing.memory import InMemoryBillingRepository
from app.modules.billing.service import BillingService

EMPLOYER = "00000000-0000-0000-0000-0000000000e1"
OTHER = "00000000-0000-0000-0000-0000000000e2"
ADMIN = "00000000-0000-0000-0000-00000000000a"
POSTING = "00000000-0000-0000-0000-0000000000b1"
CLOSED = "00000000-0000-0000-0000-0000000000b2"
TOP7 = "00000000-0000-0000-0000-0000000000a7"
OFF = "00000000-0000-0000-0000-0000000000a0"
NOW = datetime(2026, 10, 20, tzinfo=UTC)
PACKAGE = {"code": "TOP_3", "name": "Nổi bật 3 ngày", "description": "Thử", "priceVnd": 99000, "durationDays": 3,
           "active": True}


@pytest.fixture
def repo():
    return InMemoryBillingRepository(
        user_id=EMPLOYER, now=NOW,
        packages={TOP7: {"id": TOP7, "code": "TOP_7", "name": "Nổi bật 7 ngày", "description": "", "priceVnd": 299000,
                         "durationDays": 7, "active": True},
                  OFF: {"id": OFF, "code": "OLD", "name": "Gói cũ", "description": "", "priceVnd": 1,
                        "durationDays": 1, "active": False}},
        postings={POSTING: {"employerId": EMPLOYER, "title": "Tin mở", "open": True, "featuredUntil": None},
                  CLOSED: {"employerId": EMPLOYER, "title": "Tin đóng", "open": False, "featuredUntil": None}})


def code(fn) -> str:
    with pytest.raises(BillingError) as err:
        fn()
    return err.value.code


def test_buy_pay_twice_extends_from_current_featured_until(repo):
    service = BillingService(repo)
    assert [p["code"] for p in service.list_packages()] == ["TOP_7"]
    order = service.create_order(TOP7, POSTING)
    assert (order["status"], order["amountVnd"], order["postingTitle"], order["paidAt"]) == (
        "PENDING", 299000, "Tin mở", None)
    assert code(lambda: service.create_order(TOP7, POSTING)) == "ORDER_PENDING_EXISTS"

    repo.packages[TOP7]["priceVnd"] = 1  # a later price change never alters an order
    paid = service.pay_order(order["id"])
    assert (paid["status"], paid["amountVnd"], paid["featuredUntil"]) == ("PAID", 299000, NOW + timedelta(days=7))
    assert code(lambda: service.pay_order(order["id"])) == "ORDER_NOT_PENDING"
    assert code(lambda: service.cancel_order(order["id"])) == "ORDER_NOT_PENDING"

    again = service.pay_order(service.create_order(TOP7, POSTING)["id"])
    assert again["featuredUntil"] == NOW + timedelta(days=14)
    assert repo.notifications == [{"recipientId": EMPLOYER, "type": "ORDER_PAID"}] * 2
    assert [o["id"] for o in service.list_my_orders()] == [again["id"], order["id"]]


def test_cancel_then_reorder(repo):
    service = BillingService(repo)
    order = service.create_order(TOP7, POSTING)
    assert service.cancel_order(order["id"])["status"] == "CANCELLED"
    assert code(lambda: service.pay_order(order["id"])) == "ORDER_NOT_PENDING"
    assert service.create_order(TOP7, POSTING)["status"] == "PENDING"


def test_order_refusals(repo):
    service = BillingService(repo)
    assert code(lambda: service.create_order(OFF, POSTING)) == "PACKAGE_NOT_FOUND"
    assert code(lambda: service.create_order(TOP7, CLOSED)) == "POSTING_NOT_ELIGIBLE"
    order = service.create_order(TOP7, POSTING)
    repo.postings[POSTING]["open"] = False  # closed between ordering and paying
    assert code(lambda: service.pay_order(order["id"])) == "POSTING_NOT_ELIGIBLE"

    repo.user_id = OTHER  # someone else's order looks missing
    assert code(lambda: service.pay_order(order["id"])) == "ORDER_NOT_FOUND"
    assert code(lambda: service.cancel_order(order["id"])) == "ORDER_NOT_FOUND"
    assert code(lambda: service.create_order(TOP7, POSTING)) == "POSTING_NOT_ELIGIBLE"
    assert service.list_my_orders() == []
    repo.role = "CANDIDATE"
    assert code(lambda: service.create_order(TOP7, POSTING)) == "NOT_EMPLOYER"


@pytest.mark.parametrize("patch", [
    {"code": "top_3"}, {"code": "X"}, {"code": "A" * 31}, {"name": " a "}, {"name": "x" * 101},
    {"description": "x" * 501}, {"priceVnd": -1}, {"priceVnd": 100_000_001}, {"durationDays": 0},
    {"durationDays": 91},
])
def test_package_validation(repo, patch):
    body = {**PACKAGE, **patch}
    repo.role = "ADMIN"
    assert code(lambda: BillingService(repo).save_package(
        None, body["code"], body["name"], body["description"], body["priceVnd"], body["durationDays"],
        body["active"])) == "INVALID_PACKAGE"


def test_admin_packages_and_orders(repo):
    service = BillingService(repo)
    args = ("TOP_3", " Nổi bật 3 ngày ", "", 99000, 3, False)
    assert code(lambda: service.save_package(None, *args)) == "NOT_ADMIN"
    service.create_order(TOP7, POSTING)
    assert service.list_admin_orders(None, 1)["total"] == 0  # not admin: nothing listed

    repo.role = "ADMIN"
    saved = service.save_package(None, *args)
    assert (saved["name"], saved["active"]) == ("Nổi bật 3 ngày", False)
    assert [p["code"] for p in service.list_admin_packages()] == ["OLD", "TOP_3", "TOP_7"]
    assert code(lambda: service.save_package(saved["id"], "TOP_7", "Trùng mã", "", 1, 1, True)) == "PACKAGE_CODE_TAKEN"
    assert service.save_package(saved["id"], "TOP_3", "Đổi giá", "", 5, 3, True)["priceVnd"] == 5
    assert [a["action"] for a in repo.audit] == ["PACKAGE_UPDATED"] * 2
    page = service.list_admin_orders("PENDING", 0)
    assert (page["total"], page["page"], page["pageSize"]) == (1, 1, 20)
    assert service.list_admin_orders("NOPE", 1)["total"] == 1


def _as(user_id, role):
    app.dependency_overrides[optional_user] = lambda: Actor(user_id, role, {"sub": user_id}, "t")


def test_routes(repo, monkeypatch):
    monkeypatch.setattr(billing_router, "PostgresBillingRepository", lambda claims: repo)
    client = TestClient(app)
    body = {"packageId": TOP7, "postingId": POSTING}
    try:
        assert [p["code"] for p in client.get("/packages").json()] == ["TOP_7"]
        assert client.post("/me/orders", json=body).status_code == 401
        assert client.get("/me/orders").status_code == 401

        _as(EMPLOYER, "EMPLOYER")
        assert client.post("/me/orders", json={**body, "amountVnd": 0}).status_code == 422
        assert client.post("/me/orders", json={**body, "postingId": "x"}).status_code == 422
        order = client.post("/me/orders", json=body).json()
        assert order["status"] == "PENDING"
        assert client.post("/me/orders", json=body).json() == {"error": "Tin này đã có một đơn chờ thanh toán"}
        assert client.post(f"/me/orders/{order['id']}/pay").json()["status"] == "PAID"
        assert client.post(f"/me/orders/{order['id']}/cancel").status_code == 409
        assert len(client.get("/me/orders").json()) == 1
        assert client.get("/admin/orders").status_code == 403
        assert client.post("/admin/packages", json=PACKAGE).status_code == 403

        _as(ADMIN, "CANDIDATE")
        assert client.post("/me/orders", json=body).status_code == 403

        _as(ADMIN, "ADMIN")
        repo.role = "ADMIN"
        created = client.post("/admin/packages", json=PACKAGE).json()
        assert created["code"] == "TOP_3"
        res = client.put(f"/admin/packages/{created['id']}", json={**PACKAGE, "durationDays": 91})
        assert res.status_code == 422 and res.json()["error"].startswith("Mã gói")
        assert client.put(f"/admin/packages/{created['id']}", json={**PACKAGE, "active": False}).json()["active"] is False
        assert len(client.get("/admin/packages").json()) == 3
        assert client.get("/admin/orders?status=PAID").json()["total"] == 1
        assert client.get("/admin/orders?status=NOPE").status_code == 422
    finally:
        app.dependency_overrides.clear()
