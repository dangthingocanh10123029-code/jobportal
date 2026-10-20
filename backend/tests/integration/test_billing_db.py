"""Ticket 47 on the real DB: simulated payment, featured ordering, RLS, admin packages + audit, revenue.

Each test runs in its own transaction, always rolled back. Run: RUN_INTEGRATION=1 uv run pytest -m integration
"""

import os
from contextlib import contextmanager
from datetime import timedelta

import psycopg
import pytest
from psycopg import errors

from app.modules.billing.domain import BillingError
from app.modules.billing.postgres import PostgresBillingRepository
from app.modules.billing.service import BillingService
from app.modules.postings.postgres import PostgresPostingRepository
from app.modules.postings.schemas import SearchFilter
from app.modules.postings.service import PostingService
from tests.integration.conftest import apply_billing_migration
from tests.integration.test_admin_rpc import _as, _refused, _signup

DATABASE_URL = os.environ.get("INTEGRATION_DATABASE_URL")
pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(not DATABASE_URL, reason="needs RUN_INTEGRATION=1 and DATABASE_URL"),
]

POSTING = """insert into public.job_postings (employer_id, title, description, location, employment_type,
               application_deadline, status, created_at)
             values (%s, %s, 'Mô tả tin tuyển dụng cho test gói dịch vụ.', 'Hà Nội', 'FULL_TIME',
               now() + interval '30 days', %s, now() - %s * interval '1 minute') returning id"""


@pytest.fixture
def db():
    with psycopg.connect(DATABASE_URL) as conn, conn.transaction(force_rollback=True):
        apply_billing_migration(conn)
        admin = _signup(conn, {"role": "CANDIDATE", "full_name": "Quản Trị Gói"})
        conn.execute("update public.profiles set role = 'ADMIN' where id = %s", (admin,))
        employer = _signup(conn, {"role": "EMPLOYER", "company_name": "Cty Gói Dịch Vụ"})
        other = _signup(conn, {"role": "EMPLOYER", "company_name": "Cty Khác"})
        candidate = _signup(conn, {"role": "CANDIDATE", "full_name": "Ứng Viên Gói"})
        (old,) = conn.execute(POSTING, (employer, "Tin cũ được đẩy", "PUBLISHED", 10)).fetchone()
        (draft,) = conn.execute(POSTING, (employer, "Tin nháp", "DRAFT", 5)).fetchone()
        (top7,) = conn.execute("select id from public.service_packages where code = 'TOP_7'").fetchone()
        yield {"conn": conn, "admin": admin, "employer": employer, "other": other, "candidate": candidate,
               "old": str(old), "draft": str(draft), "top7": str(top7)}


def _service(db, monkeypatch, user_id):
    conn = db["conn"]

    @contextmanager
    def tx(claims, pool=None):
        with _as(conn, user_id):
            yield conn

    monkeypatch.setattr("app.modules.billing.postgres.user_tx", tx)
    monkeypatch.setattr("app.modules.postings.postgres.user_tx", tx)
    return BillingService(PostgresBillingRepository({"sub": str(user_id)} if user_id else None))


def _code(fn) -> str:
    with pytest.raises(BillingError) as err:
        fn()
    return err.value.code


def test_pay_features_posting_first_notifies_and_counts_revenue(db, monkeypatch):
    conn = db["conn"]
    (now,) = conn.execute("select now()").fetchone()
    (newer,) = conn.execute(POSTING, (db["employer"], "Tin mới chưa đẩy", "PUBLISHED", 1)).fetchone()
    me = _service(db, monkeypatch, db["employer"])
    order = me.create_order(db["top7"], db["old"])
    assert (order["status"], order["amountVnd"], order["packageName"], order["postingTitle"]) == (
        "PENDING", 299000, "Tin nổi bật 7 ngày", "Tin cũ được đẩy")
    assert _code(lambda: me.create_order(db["top7"], db["old"])) == "ORDER_PENDING_EXISTS"

    paid = me.pay_order(order["id"])
    assert (paid["status"], paid["featuredUntil"]) == ("PAID", now + timedelta(days=7))
    again = me.pay_order(me.create_order(db["top7"], db["old"])["id"])
    assert again["featuredUntil"] == now + timedelta(days=14)  # extends from the running featuring
    # One transaction: both orders share created_at (now()), so only the set is checked.
    assert {o["id"] for o in me.list_my_orders()} == {again["id"], order["id"]}
    assert conn.execute("select type, link from public.notifications where recipient_id = %s",
                        (db["employer"],)).fetchall() == [("ORDER_PAID", "/employer/billing")] * 2

    postings = PostingService(PostgresPostingRepository(None))
    _service(db, monkeypatch, None)
    items = [p for p in postings.list_open(SearchFilter()).items if p.employer_id == db["employer"]]
    assert [(str(p.id), p.featured) for p in items] == [(db["old"], True), (str(newer), False)]
    assert postings.get_public(db["old"]).featured

    admin = _service(db, monkeypatch, db["admin"])
    page = admin.list_admin_orders("PAID", 1)
    assert page["total"] >= 2 and page["items"][0]["companyName"] == "Cty Gói Dịch Vụ"
    with _as(conn, db["admin"]):
        revenue = conn.execute("select public.admin_stats() -> 'revenue'").fetchone()[0]
        assert revenue["paidOrders"] >= 2 and revenue["last30DaysVnd"] >= 598000
        assert {"users", "postings", "daily"} <= conn.execute("select public.admin_stats()").fetchone()[0].keys()


def test_cancel_and_refusals(db, monkeypatch):
    me = _service(db, monkeypatch, db["employer"])
    assert _code(lambda: me.create_order(db["top7"], db["draft"])) == "POSTING_NOT_ELIGIBLE"
    order = me.create_order(db["top7"], db["old"])

    for role in ("other", "candidate", "admin"):
        other = _service(db, monkeypatch, db[role])
        assert other.list_my_orders() == []
        assert _code(lambda o=other: o.pay_order(order["id"])) == "ORDER_NOT_FOUND"
        assert _code(lambda o=other: o.cancel_order(order["id"])) == "ORDER_NOT_FOUND"
    assert _code(lambda: _service(db, monkeypatch, db["other"]).create_order(db["top7"], db["old"])) == \
        "POSTING_NOT_ELIGIBLE"
    assert _code(lambda: _service(db, monkeypatch, db["candidate"]).create_order(db["top7"], db["old"])) == \
        "NOT_EMPLOYER"
    assert _service(db, monkeypatch, db["other"]).list_admin_orders(None, 1)["total"] == 0

    me = _service(db, monkeypatch, db["employer"])
    assert me.cancel_order(order["id"])["status"] == "CANCELLED"
    assert _code(lambda: me.pay_order(order["id"])) == "ORDER_NOT_PENDING"

    conn = db["conn"]
    _refused(conn, db["employer"], "update public.job_postings set featured_until = now() + interval '1 year' "
             "where id = %s", (db["old"],), errors.InsufficientPrivilege)
    _refused(conn, db["employer"], "update public.orders set status = 'PAID'", (), errors.InsufficientPrivilege)
    _refused(conn, db["employer"], "insert into public.orders (employer_id, posting_id, package_id, package_name, "
             "duration_days, amount_vnd) values (%s, %s, %s, 'x', 7, 0)",
             (db["employer"], db["old"], db["top7"]), errors.InsufficientPrivilege)
    _refused(conn, None, "select public.create_order(%s, %s)", (db["top7"], db["old"]), errors.InsufficientPrivilege)
    _refused(conn, db["employer"], "select public.admin_stats_base()", (), errors.InsufficientPrivilege)
    with _as(conn, db["other"]):  # RLS: someone else's order is invisible
        assert conn.execute("select count(*) from public.orders where id = %s", (order["id"],)).fetchone() == (0,)


def test_admin_packages_audit_and_visibility(db, monkeypatch):
    employer = _service(db, monkeypatch, db["employer"])
    assert _code(lambda: employer.save_package(None, "TOP_1", "Một ngày", "", 1, 1, True)) == "NOT_ADMIN"

    admin = _service(db, monkeypatch, db["admin"])
    hidden = admin.save_package(None, "IT_TOP_1", "  Gói kiểm thử  ", "", 1000, 1, False)
    assert (hidden["name"], hidden["active"]) == ("Gói kiểm thử", False)
    assert _code(lambda: admin.save_package(hidden["id"], "TOP_7", "Trùng mã", "", 1, 1, True)) == "PACKAGE_CODE_TAKEN"
    assert hidden["id"] in [p["id"] for p in admin.list_admin_packages()]
    assert hidden["id"] not in [p["id"] for p in admin.list_packages()]

    anon = _service(db, monkeypatch, None)
    assert {p["code"] for p in anon.list_packages()} >= {"TOP_7", "TOP_14", "TOP_30"}
    assert hidden["id"] not in [p["id"] for p in anon.list_packages()]
    me = _service(db, monkeypatch, db["employer"])
    assert _code(lambda: me.create_order(hidden["id"], db["old"])) == "PACKAGE_NOT_FOUND"

    conn = db["conn"]
    assert conn.execute("select action, target_type, details ->> 'active' from public.admin_audit_log "
                        "where target_id = %s", (hidden["id"],)).fetchall() == [("PACKAGE_UPDATED", "PACKAGE", "false")]
    assert _refused(conn, db["admin"], "select public.admin_save_package(null, 'bad code', 'Tên', '', 1, 1, true)") == \
        "INVALID_PACKAGE"
    _refused(conn, db["admin"], "update public.service_packages set price_vnd = 0", (), errors.InsufficientPrivilege)
