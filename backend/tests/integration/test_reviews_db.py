"""Ticket 45 on the real DB: who may review, RLS + the public view, admin moderation, audit, notification.

Each test runs in its own transaction, always rolled back. Run: RUN_INTEGRATION=1 uv run pytest -m integration
"""

import os
from contextlib import contextmanager

import psycopg
import pytest
from psycopg import errors

from app.modules.reviews.domain import ReviewError
from app.modules.reviews.postgres import PostgresReviewRepository
from app.modules.reviews.service import ReviewService
from tests.integration.conftest import apply_reviews_migration
from tests.integration.test_admin_rpc import _as, _refused, _signup

DATABASE_URL = os.environ.get("INTEGRATION_DATABASE_URL")
pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(not DATABASE_URL, reason="needs RUN_INTEGRATION=1 and DATABASE_URL"),
]

REVIEW = {"rating": 4, "title": "Môi trường kiểm thử", "pros": "Đồng nghiệp hỗ trợ tốt", "cons": "Quy trình hơi chậm",
          "anonymous": False}
SUBMIT = "select public.submit_review(%s, %s, %s, %s, %s, %s)"


@pytest.fixture
def db():
    with psycopg.connect(DATABASE_URL) as conn, conn.transaction(force_rollback=True):
        apply_reviews_migration(conn)
        admin = _signup(conn, {"role": "CANDIDATE", "full_name": "Quản Trị Đánh Giá"})
        conn.execute("update public.profiles set role = 'ADMIN' where id = %s", (admin,))
        employer = _signup(conn, {"role": "EMPLOYER", "company_name": "Cty Đánh Giá"})
        other_employer = _signup(conn, {"role": "EMPLOYER", "company_name": "Cty Chưa Ứng Tuyển"})
        candidate = _signup(conn, {"role": "CANDIDATE", "full_name": "Ứng Viên Đánh Giá"})
        outsider = _signup(conn, {"role": "CANDIDATE", "full_name": "Ứng Viên Ngoài"})
        (posting,) = conn.execute(
            """insert into public.job_postings (employer_id, title, description, location, employment_type,
                 application_deadline, status)
               values (%s, 'Tin đánh giá', 'Mô tả tin tuyển dụng cho test đánh giá.', 'Hà Nội', 'FULL_TIME',
                 now() + interval '30 days', 'PUBLISHED') returning id""", (employer,)).fetchone()
        conn.execute("insert into public.applications (job_posting_id, candidate_id, resume_path, status) "
                     "values (%s, %s, %s, 'WITHDRAWN')", (posting, candidate, f"{candidate}/cv.pdf"))
        yield {"conn": conn, "admin": admin, "employer": employer, "other_employer": other_employer,
               "candidate": candidate, "outsider": outsider}


def _service(db, monkeypatch, user_id):
    conn = db["conn"]

    @contextmanager
    def tx(claims, pool=None):
        with _as(conn, user_id):
            yield conn

    monkeypatch.setattr("app.modules.reviews.postgres.user_tx", tx)
    return ReviewService(PostgresReviewRepository({"sub": str(user_id)} if user_id else None))


def _submit(service, company, **kw):
    return service.submit(str(company), **{**REVIEW, **kw})


def test_candidate_flow_moderation_audit_notification_and_public_view(db, monkeypatch):
    company = str(db["employer"])
    me = _service(db, monkeypatch, db["candidate"])
    assert me.can_review(company)  # a withdrawn application still counts
    mine = _submit(me, company, title="  Môi trường kiểm thử  ")
    assert (mine["status"], mine["title"], mine["authorName"]) == ("PENDING", "Môi trường kiểm thử", "Ứng Viên Đánh Giá")
    assert not me.can_review(company)
    with pytest.raises(ReviewError) as err:
        _submit(me, company)
    assert err.value.code == "REVIEW_EXISTS"

    anon = _service(db, monkeypatch, None)
    assert anon.list_company(company, 1)["total"] == 0  # pending is not public

    admin = _service(db, monkeypatch, db["admin"])
    assert admin.list_admin("PENDING", 1)["items"][0]["authorEmail"].startswith("it-")
    admin.moderate(mine["id"], False, "  Nội dung chưa phù hợp  ")
    me = _service(db, monkeypatch, db["candidate"])
    rejected = me.get_mine(company)
    assert (rejected["status"], rejected["rejectReason"]) == ("REJECTED", "Nội dung chưa phù hợp")
    again = _submit(me, company, rating=5, anonymous=True)
    assert (again["id"], again["status"], again["rejectReason"]) == (mine["id"], "PENDING", None)

    admin = _service(db, monkeypatch, db["admin"])
    admin.moderate(mine["id"], True, None)
    conn = db["conn"]
    assert conn.execute("select action, target_type from public.admin_audit_log where target_id = %s order by seq",
                        (mine["id"],)).fetchall() == [("REVIEW_REJECTED", "REVIEW"), ("REVIEW_APPROVED", "REVIEW")]
    assert conn.execute("select type, link from public.notifications where recipient_id = %s order by created_at",
                        (db["candidate"],)).fetchall()[-2:] == [("REVIEW_MODERATED", f"/companies/{company}")] * 2

    anon = _service(db, monkeypatch, None)
    page = anon.list_company(company, 1)
    assert page["rating"] == {"average": 5.0, "count": 1,
                              "distribution": {"1": 0, "2": 0, "3": 0, "4": 0, "5": 1}}
    assert page["items"][0]["authorName"] == "Ứng viên ẩn danh" and "candidateId" not in page["items"][0]
    (rating, count) = conn.execute("select rating, review_count from public.company_summaries where id = %s",
                                   (company,)).fetchone()
    assert (rating, count) == (5.0, 1)


def test_outsiders_and_wrong_roles_are_refused(db, monkeypatch):
    company = str(db["employer"])
    me = _service(db, monkeypatch, db["candidate"])
    review_id = _submit(me, company)["id"]
    assert not me.can_review(str(db["other_employer"]))
    with pytest.raises(ReviewError) as err:
        _submit(me, db["other_employer"])
    assert err.value.code == "NOT_ELIGIBLE"

    for role in ("outsider", "employer"):
        other = _service(db, monkeypatch, db[role])
        assert other.get_mine(company) is None and other.list_admin(None, 1)["total"] == 0
        with pytest.raises(ReviewError) as err:
            other.moderate(review_id, True, None)
        assert err.value.code == "NOT_ADMIN"
        with _as(db["conn"], db[role]) as conn:  # RLS: someone else's row is invisible
            assert conn.execute("select count(*) from public.company_reviews where id = %s",
                                (review_id,)).fetchone() == (0,)
    _refused(db["conn"], db["candidate"], "update public.company_reviews set status = 'APPROVED'", (),
             errors.InsufficientPrivilege)
    _refused(db["conn"], None, SUBMIT, (company, 5, "Tiêu đề hợp lệ", "Ưu điểm đủ dài", "Nhược điểm đủ dài", False),
             errors.InsufficientPrivilege)
    _refused(db["conn"], None, "select count(*) from public.company_reviews", (), errors.InsufficientPrivilege)


@pytest.mark.parametrize("params", [
    (0, "Tiêu đề hợp lệ", "Ưu điểm đủ dài", "Nhược điểm đủ dài", False),
    (5, "abcd", "Ưu điểm đủ dài", "Nhược điểm đủ dài", False),
    (5, "Tiêu đề hợp lệ", "ngắn", "Nhược điểm đủ dài", False),
    (5, "Tiêu đề hợp lệ", "Ưu điểm đủ dài", "Nhược điểm đủ dài", None),
])
def test_rpc_validates_even_when_called_directly(db, params):
    assert _refused(db["conn"], db["candidate"], SUBMIT, (db["employer"], *params)) == "INVALID_REVIEW"


def test_reject_needs_a_reason_in_the_rpc(db, monkeypatch):
    review_id = _submit(_service(db, monkeypatch, db["candidate"]), db["employer"])["id"]
    assert _refused(db["conn"], db["admin"], "select public.admin_moderate_review(%s, false, ' ab ')",
                    (review_id,)) == "INVALID_REASON"
