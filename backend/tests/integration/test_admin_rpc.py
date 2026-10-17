"""Ticket 32 security on the real DB: who may act as ADMIN, what the RPCs refuse, audit, hidden postings.

Each test runs in its own transaction, always rolled back. Run: RUN_INTEGRATION=1 uv run pytest -m integration
"""

import json
import os
from contextlib import contextmanager
from uuid import uuid4

import psycopg
import pytest
from psycopg import errors

from app.modules.admin.domain import AdminError
from app.modules.admin.postgres import PostgresAdminRepository
from tests.integration.conftest import apply_admin_migration

DATABASE_URL = os.environ.get("INTEGRATION_DATABASE_URL")
pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(not DATABASE_URL, reason="needs RUN_INTEGRATION=1 and DATABASE_URL"),
]


def _signup(conn, meta: dict):
    user_id = uuid4()
    conn.execute(
        "insert into auth.users (id, email, raw_user_meta_data) values (%s, %s, %s)",
        (user_id, f"it-{user_id}@example.test", json.dumps(meta)),
    )
    return user_id


@contextmanager
def _as(conn, user_id):
    """One savepoint run as `user_id` (None = anon); back to postgres afterwards."""
    with conn.transaction():
        conn.execute(
            "select set_config('role', %s, true), set_config('request.jwt.claims', %s, true)",
            ("authenticated" if user_id else "anon", json.dumps({"sub": str(user_id), "role": "authenticated"}
                                                               if user_id else {"role": "anon"})),
        )
        yield conn
        conn.execute("reset role")


def _refused(conn, user_id, query, params=(), exc=errors.RaiseException):
    with pytest.raises(exc) as err, _as(conn, user_id):
        conn.execute(query, params)
    return err.value.diag.message_primary


@pytest.fixture
def db():
    with psycopg.connect(DATABASE_URL) as conn, conn.transaction(force_rollback=True):
        apply_admin_migration(conn)
        admin = _signup(conn, {"role": "CANDIDATE", "full_name": "Quản Trị"})
        conn.execute("update public.profiles set role = 'ADMIN' where id = %s", (admin,))  # = make-admin.sql
        other_admin = _signup(conn, {"role": "CANDIDATE", "full_name": "Quản Trị 2"})
        conn.execute("update public.profiles set role = 'ADMIN' where id = %s", (other_admin,))
        employer = _signup(conn, {"role": "EMPLOYER", "company_name": "Cty Kiểm Duyệt"})
        candidate = _signup(conn, {"role": "CANDIDATE", "full_name": "Ứng Viên Kiểm Duyệt"})
        (posting,) = conn.execute(
            """insert into public.job_postings (employer_id, title, description, location, employment_type,
                 application_deadline, status)
               values (%s, 'Tin kiểm duyệt', 'Mô tả tin tuyển dụng cho test kiểm duyệt.', 'Hà Nội', 'FULL_TIME',
                 now() + interval '30 days', 'PUBLISHED') returning id""",
            (employer,),
        ).fetchone()
        yield {"conn": conn, "admin": admin, "other_admin": other_admin, "employer": employer,
               "candidate": candidate, "posting": posting}


@pytest.mark.parametrize("meta", [{"role": "ADMIN", "full_name": "Hacker"}, {"full_name": "Không vai trò"},
                                  {"role": "admin", "full_name": "x"}])
def test_signup_cannot_self_assign_admin_or_skip_role(db, meta):
    with pytest.raises(errors.CheckViolation), db["conn"].transaction():
        _signup(db["conn"], meta)


def test_users_cannot_grant_themselves_admin_or_unlock(db):
    conn, cand = db["conn"], db["candidate"]
    for column, value in [("role", "ADMIN"), ("locked_at", None), ("locked_reason", None)]:
        _refused(conn, cand, f"update public.profiles set {column} = %s where id = %s", (value, cand),
                 errors.InsufficientPrivilege)
    _refused(conn, db["employer"], "update public.job_postings set hidden_at = null where id = %s", (db["posting"],),
             errors.InsufficientPrivilege)
    _refused(conn, db["employer"], "update public.companies set verified_at = now() where id = %s", (db["employer"],),
             errors.InsufficientPrivilege)


@pytest.mark.parametrize("call", [
    "select public.admin_set_user_lock(%(user)s, true, 'Lý do đủ dài')",
    "select public.admin_set_posting_hidden(%(posting)s, true, 'Lý do đủ dài')",
    "select public.admin_set_company_verified(%(user)s, true)",
    "select public.admin_stats()",
])
def test_rpcs_refuse_non_admins(db, call):
    params = {"user": db["employer"], "posting": db["posting"]}
    for who in (db["candidate"], db["employer"]):
        assert _refused(db["conn"], who, call, params, errors.InsufficientPrivilege) == "NOT_ADMIN"
    _refused(db["conn"], None, call, params, errors.InsufficientPrivilege)  # anon: no EXECUTE at all


def test_admin_views_are_empty_for_non_admins(db):
    conn = db["conn"]
    for view in ("admin_users", "admin_postings", "admin_companies", "admin_audit_entries", "admin_audit_log"):
        with _as(conn, db["candidate"]):
            assert conn.execute(f"select count(*) from public.{view}").fetchone()[0] == 0
    with _as(conn, db["admin"]):
        assert conn.execute("select count(*) from public.admin_users where user_id = %s",
                            (db["candidate"],)).fetchone()[0] == 1


def test_lock_refusals(db):
    conn = db["conn"]
    lock = "select public.admin_set_user_lock(%s, true, 'Lý do đủ dài')"
    assert _refused(conn, db["admin"], lock, (db["admin"],)) == "CANNOT_LOCK_SELF"
    assert _refused(conn, db["admin"], lock, (db["other_admin"],)) == "CANNOT_LOCK_ADMIN"
    assert _refused(conn, db["admin"], lock, (uuid4(),)) == "USER_NOT_FOUND"
    assert _refused(conn, db["admin"], "select public.admin_set_user_lock(%s, true, '  abc ')",
                    (db["candidate"],)) == "INVALID_REASON"


def test_lock_bans_and_audits_in_one_transaction_then_unlock(db):
    conn, cand = db["conn"], db["candidate"]
    with _as(conn, db["admin"]):
        conn.execute("select public.admin_set_user_lock(%s, true, '  Spam ứng tuyển  ')", (cand,))
    locked = conn.execute(
        """select p.locked_reason, p.locked_at is not null, u.banned_until > now() + interval '50 years'
           from public.profiles p join auth.users u on u.id = p.id where p.id = %s""", (cand,)).fetchone()
    assert locked == ("Spam ứng tuyển", True, True)
    entry = conn.execute(
        "select actor_id, actor_email, action, target_type, target_label, details from public.admin_audit_log "
        "where target_id = %s", (cand,)).fetchone()
    assert entry == (db["admin"], f"it-{db['admin']}@example.test", "USER_LOCKED", "USER",
                     f"it-{cand}@example.test", {"reason": "Spam ứng tuyển"})

    with _as(conn, db["admin"]):
        conn.execute("select public.admin_set_user_lock(%s, false)", (cand,))
    assert conn.execute("""select p.locked_at, u.banned_until from public.profiles p join auth.users u on u.id = p.id
                           where p.id = %s""", (cand,)).fetchone() == (None, None)
    assert conn.execute("select count(*) from public.admin_audit_log where target_id = %s",
                        (cand,)).fetchone()[0] == 2


def test_audit_log_is_append_only_even_for_postgres(db):
    conn = db["conn"]
    with _as(conn, db["admin"]):
        conn.execute("select public.admin_set_company_verified(%s, true)", (db["employer"],))
    for stmt in ("update public.admin_audit_log set action = 'USER_UNLOCKED'", "delete from public.admin_audit_log"):
        with pytest.raises(errors.InsufficientPrivilege), conn.transaction():
            conn.execute(stmt)


def test_hidden_posting_leaves_public_reads_and_takes_no_new_applications(db):
    conn, posting, cand = db["conn"], db["posting"], db["candidate"]
    resume = f"{cand}/cv.pdf"
    conn.execute("insert into storage.objects (bucket_id, name) values ('resumes', %s)", (resume,))
    (application,) = conn.execute(
        "insert into public.applications (job_posting_id, candidate_id, resume_path) values (%s, %s, %s) returning id",
        (posting, cand, resume),
    ).fetchone()
    conn.execute("update public.job_postings set status = 'CLOSED' where id = %s", (posting,))  # CLOSED can be hidden
    with _as(conn, db["admin"]):
        conn.execute("select public.admin_set_posting_hidden(%s, true, 'Nội dung lừa đảo')", (posting,))

    for who in (None, cand):
        with _as(conn, who):
            for view in ("job_postings", "job_postings_with_company", "open_job_postings"):
                assert conn.execute(f"select count(*) from public.{view} where id = %s", (posting,)).fetchone()[0] == 0
    for who in (db["employer"], db["admin"]):
        with _as(conn, who):
            row = conn.execute("select hidden_reason from public.job_postings_with_company where id = %s",
                               (posting,)).fetchone()
            assert row == ("Nội dung lừa đảo",)
    with _as(conn, cand):  # old Applications stay in the Candidate's list
        assert conn.execute("select posting_title from public.candidate_application_summaries where id = %s",
                            (application,)).fetchone() == ("Tin kiểm duyệt",)

    notice = conn.execute("select type, body, link from public.notifications where recipient_id = %s "
                          "and type = 'POSTING_HIDDEN'", (db["employer"],)).fetchone()
    assert notice == ("POSTING_HIDDEN", 'Tin "Tin kiểm duyệt" đã bị quản trị viên ẩn. Lý do: Nội dung lừa đảo',
                      "/employer/postings")


def test_submit_application_refuses_a_hidden_open_posting(db):
    conn, cand = db["conn"], db["candidate"]
    resume = f"{cand}/cv2.pdf"
    conn.execute("insert into storage.objects (bucket_id, name) values ('resumes', %s)", (resume,))
    with _as(conn, db["admin"]):
        conn.execute("select public.admin_set_posting_hidden(%s, true, 'Vi phạm quy định')", (db["posting"],))
    assert _refused(conn, cand, "select public.submit_application(%s, %s)",
                    (db["posting"], resume)) == "POSTING_NOT_OPEN"


def test_admin_repository_against_real_views(db, monkeypatch):
    conn = db["conn"]

    @contextmanager
    def tx(claims, pool=None):
        with _as(conn, db["admin"]):
            yield conn

    monkeypatch.setattr("app.modules.admin.postgres.user_tx", tx)
    repo = PostgresAdminRepository({"sub": str(db["admin"])})
    stats = repo.stats()
    assert len(stats["daily"]) == 30 and set(stats["users"]) == {"CANDIDATE", "EMPLOYER", "ADMIN", "locked"}
    assert set(stats["applications"]) == {"SUBMITTED", "REVIEWING", "INTERVIEWING", "OFFERED", "HIRED", "REJECTED",
                                          "WITHDRAWN"}
    assert stats["users"]["ADMIN"] >= 2 and len(stats["topIndustries"]) <= 5

    rows, total = repo.list_users({"q": "ung vien kiem duyet", "role": "CANDIDATE", "locked": False}, 0, 20)
    assert total == 1 and rows[0]["displayName"] == "Ứng Viên Kiểm Duyệt"
    assert repo.list_users({"q": "ung vien kiem duyet"}, 20, 20) == ([], 1)
    assert repo.get_user(str(db["employer"]))["postings"] == 1

    repo.set_posting_hidden(str(db["posting"]), True, "Vi phạm quy định")
    [posting], _ = repo.list_postings({"hidden": True, "employerId": db["employer"], "status": "PUBLISHED"}, 0, 20)
    assert posting["hiddenReason"] == "Vi phạm quy định" and posting["companyName"] == "Cty Kiểm Duyệt"

    repo.set_company_verified(str(db["employer"]), True)
    [company], _ = repo.list_companies({"q": "kiem duyet", "verified": True}, 0, 20)
    assert company["companyVerified"] is True and company["employerEmail"] == f"it-{db['employer']}@example.test"

    entries, _ = repo.list_audit({"actorId": db["admin"]}, 0, 20)
    assert [e["action"] for e in entries] == ["COMPANY_VERIFIED", "POSTING_HIDDEN"]

    with pytest.raises(AdminError) as err:
        repo.set_user_lock(str(db["admin"]), True, "Tự khóa mình")
    assert err.value.code == "CANNOT_LOCK_SELF"
