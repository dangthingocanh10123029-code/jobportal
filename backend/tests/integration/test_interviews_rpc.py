"""Ticket 40 on the real DB: who may schedule/answer/cancel/finish, limits, notifications, RLS.

Each test runs in its own transaction, always rolled back. Run: RUN_INTEGRATION=1 uv run pytest -m integration
"""

import os
from datetime import UTC, datetime, timedelta

import psycopg
import pytest
from psycopg import errors

from app.auth import Actor
from app.modules.interviews.domain import InterviewError
from app.modules.interviews.postgres import PostgresInterviewRepository
from app.modules.interviews.schemas import CancelInput, InterviewInput
from tests.integration.conftest import apply_admin_migration, apply_interviews_migration
from tests.integration.test_admin_rpc import _as, _refused, _signup
from tests.integration.test_postgres_reads import _claims, _savepoint_tx

DATABASE_URL = os.environ.get("INTEGRATION_DATABASE_URL")
pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(not DATABASE_URL, reason="needs RUN_INTEGRATION=1 and DATABASE_URL"),
]

SCHEDULE = "select id, status from public.schedule_interview(%s, %s, %s, %s, %s, %s)"
TOMORROW = datetime.now(UTC) + timedelta(days=1)


@pytest.fixture
def db():
    with psycopg.connect(DATABASE_URL) as conn, conn.transaction(force_rollback=True):
        apply_admin_migration(conn)
        apply_interviews_migration(conn)
        employer = _signup(conn, {"role": "EMPLOYER", "company_name": "Cty Phỏng Vấn"})
        other_employer = _signup(conn, {"role": "EMPLOYER", "company_name": "Cty Khác"})
        candidate = _signup(conn, {"role": "CANDIDATE", "full_name": "Ứng Viên Phỏng Vấn"})
        other_candidate = _signup(conn, {"role": "CANDIDATE", "full_name": "Ứng Viên Khác"})
        (posting,) = conn.execute(
            """insert into public.job_postings (employer_id, title, description, location, employment_type,
                 application_deadline, status)
               values (%s, 'Tin phỏng vấn', 'Mô tả tin tuyển dụng cho test phỏng vấn.', 'Hà Nội', 'FULL_TIME',
                 now() + interval '30 days', 'PUBLISHED') returning id""",
            (employer,),
        ).fetchone()
        resume = f"{candidate}/cv.pdf"
        conn.execute("insert into storage.objects (bucket_id, name) values ('resumes', %s)", (resume,))
        (application,) = conn.execute(
            "insert into public.applications (job_posting_id, candidate_id, resume_path) values (%s, %s, %s) "
            "returning id",
            (posting, candidate, resume),
        ).fetchone()
        with _as(conn, employer):
            conn.execute("select public.change_application_status(%s, 'REVIEWING')", (application,))
        yield {"conn": conn, "employer": employer, "other_employer": other_employer, "candidate": candidate,
               "other_candidate": other_candidate, "posting": posting, "application": application}


def _schedule(db, who=None, at=TOMORROW, duration=60, mode="ONLINE", location="https://meet.example/abc",
              note=None):
    with _as(db["conn"], who or db["employer"]):
        return db["conn"].execute(SCHEDULE, (db["application"], at, duration, mode, location, note)).fetchone()


def _notices(db, who, type_):
    return db["conn"].execute("select body, link from public.notifications where recipient_id = %s and type = %s",
                              (who, type_)).fetchall()


def test_schedule_moves_reviewing_to_interviewing_with_history_and_notifies_candidate(db):
    conn = db["conn"]
    interview, status = _schedule(db, note="  Mang laptop  ")
    assert status == "PROPOSED"
    assert conn.execute("select status from public.applications where id = %s",
                        (db["application"],)).fetchone() == ("INTERVIEWING",)
    assert conn.execute(
        "select from_status, to_status, changed_by_role from public.application_status_changes "
        "where application_id = %s order by id desc limit 1", (db["application"],)).fetchone() == \
        ("REVIEWING", "INTERVIEWING", "EMPLOYER")
    assert conn.execute("select note from public.interviews where id = %s", (interview,)).fetchone() == \
        ("Mang laptop",)
    [(body, link)] = _notices(db, db["candidate"], "INTERVIEW_SCHEDULED")
    assert body.startswith('Cty Phỏng Vấn mời bạn phỏng vấn tin "Tin phỏng vấn" lúc ')
    assert link == f"/candidate/applications/{db['application']}"

    for who in (db["candidate"], db["employer"]):
        with _as(conn, who):
            row = conn.execute("select posting_title, company_name, candidate_name from public.interview_details "
                               "where id = %s", (interview,)).fetchone()
            assert row == ("Tin phỏng vấn", "Cty Phỏng Vấn", "Ứng Viên Phỏng Vấn")
    for who in (db["other_candidate"], db["other_employer"], None):
        with _as(conn, who):
            if who is None:
                with pytest.raises(errors.InsufficientPrivilege), conn.transaction():
                    conn.execute("select 1 from public.interview_details")
            else:
                assert conn.execute("select count(*) from public.interview_details").fetchone() == (0,)
                assert conn.execute("select count(*) from public.interviews").fetchone() == (0,)


def test_schedule_refusals(db):
    conn, app = db["conn"], db["application"]
    args = (app, TOMORROW, 60, "ONLINE", "https://meet.example/x", None)
    for who in (db["other_employer"], db["candidate"]):
        assert _refused(conn, who, SCHEDULE, args) == "APPLICATION_NOT_FOUND"
    for at in (datetime.now(UTC) - timedelta(minutes=1), datetime.now(UTC) + timedelta(days=91)):
        assert _refused(conn, db["employer"], SCHEDULE, (app, at, 60, "ONLINE", "https://x.y", None)) == \
            "INVALID_SCHEDULE_TIME"
    _schedule(db)
    assert _refused(conn, db["employer"], SCHEDULE, args) == "INTERVIEW_ALREADY_PENDING"
    _refused(conn, None, SCHEDULE, args, errors.InsufficientPrivilege)  # anon: no EXECUTE


def test_schedule_only_on_reviewing_or_interviewing(db):
    with _as(db["conn"], db["employer"]):
        db["conn"].execute("select public.change_application_status(%s, 'REJECTED')", (db["application"],))
    assert _refused(db["conn"], db["employer"], SCHEDULE,
                    (db["application"], TOMORROW, 60, "ONLINE", "https://x.y", None)) == \
        "APPLICATION_NOT_INTERVIEWABLE"


@pytest.mark.parametrize(("duration", "mode", "location"), [
    (10, "ONLINE", "https://x.y"), (241, "ONLINE", "https://x.y"), (60, "ONLINE", "ftp://x.y"),
    (60, "ONLINE", "https://x y"), (60, "ONSITE", "Q1"), (60, "PHONE", "https://x.y"),
])
def test_table_checks_guard_bad_input(db, duration, mode, location):
    with pytest.raises(errors.CheckViolation):
        _schedule(db, duration=duration, mode=mode, location=location)


def test_candidate_answers_once_and_employer_is_notified(db):
    conn = db["conn"]
    interview, _ = _schedule(db)
    respond = "select status, candidate_note from public.respond_interview(%s, %s, %s)"
    assert _refused(conn, db["other_candidate"], respond, (interview, "CONFIRM", None)) == "INTERVIEW_NOT_FOUND"
    assert _refused(conn, db["employer"], respond, (interview, "CONFIRM", None)) == "INTERVIEW_NOT_FOUND"
    assert _refused(conn, db["candidate"], respond, (interview, "MAYBE", None)) == "INVALID_RESPONSE"
    assert _refused(conn, db["candidate"], respond, (interview, "RESCHEDULE", "  ")) == "RESCHEDULE_NOTE_REQUIRED"
    with _as(conn, db["candidate"]):
        assert conn.execute(respond, (interview, "RESCHEDULE", " Chiều thứ 6 ")).fetchone() == \
            ("RESCHEDULE_REQUESTED", "Chiều thứ 6")
    assert _refused(conn, db["candidate"], respond, (interview, "CONFIRM", None)) == "INVALID_INTERVIEW_STATE"
    [(body, link)] = _notices(db, db["employer"], "INTERVIEW_RESPONDED")
    assert "Ứng Viên Phỏng Vấn đã xin đổi giờ" in body and body.endswith("Ghi chú: Chiều thứ 6")
    assert link == f"/employer/postings/{db['posting']}/applications"
    # A reschedule request frees the slot for a new proposal.
    assert _schedule(db, at=TOMORROW + timedelta(days=1))[1] == "PROPOSED"


def test_cancel_and_done(db):
    conn = db["conn"]
    interview, _ = _schedule(db)
    cancel, done = "select status from public.cancel_interview(%s, %s)", "select status from public.mark_interview_done(%s)"
    assert _refused(conn, db["other_employer"], cancel, (interview, None)) == "INTERVIEW_NOT_FOUND"
    assert _refused(conn, db["candidate"], cancel, (interview, None)) == "INTERVIEW_NOT_FOUND"
    assert _refused(conn, db["employer"], cancel, (interview, "x" * 501)) == "INVALID_CANCEL_REASON"
    assert _refused(conn, db["employer"], done, (interview,)) == "INVALID_INTERVIEW_STATE"  # still PROPOSED
    with _as(conn, db["candidate"]):
        conn.execute("select public.respond_interview(%s, 'CONFIRM')", (interview,))
    assert _refused(conn, db["employer"], done, (interview,)) == "INTERVIEW_NOT_DUE"
    conn.execute("update public.interviews set scheduled_at = now() - interval '1 hour' where id = %s", (interview,))
    assert _refused(conn, db["candidate"], done, (interview,)) == "INTERVIEW_NOT_FOUND"
    with _as(conn, db["employer"]):
        assert conn.execute(done, (interview,)).fetchone() == ("DONE",)
    assert _refused(conn, db["employer"], cancel, (interview, None)) == "INVALID_INTERVIEW_STATE"

    second, _ = _schedule(db)
    with _as(conn, db["employer"]):
        assert conn.execute(cancel, (second, " Đã tuyển đủ ")).fetchone() == ("CANCELLED",)
    [(body, _link)] = _notices(db, db["candidate"], "INTERVIEW_CANCELLED")
    assert body.endswith("Lý do: Đã tuyển đủ")


def test_users_cannot_write_interviews_directly(db):
    conn = db["conn"]
    interview, _ = _schedule(db)
    for who, stmt in [(db["employer"], "update public.interviews set status = 'DONE' where id = %s"),
                      (db["candidate"], "update public.interviews set status = 'CONFIRMED' where id = %s"),
                      (db["employer"], "delete from public.interviews where id = %s")]:
        _refused(conn, who, stmt, (interview,), errors.InsufficientPrivilege)
    _refused(conn, db["employer"], "insert into public.interviews (application_id, scheduled_at, duration_minutes, "
             "mode, location) values (%s, now(), 60, 'ONLINE', 'https://x.y')", (db["application"],),
             errors.InsufficientPrivilege)


def test_unique_index_backs_the_pending_rule(db):
    conn = db["conn"]
    _schedule(db)
    with pytest.raises(errors.UniqueViolation), conn.transaction():
        conn.execute("insert into public.interviews (application_id, scheduled_at, duration_minutes, mode, location, "
                     "status) values (%s, now() + interval '2 days', 60, 'ONSITE', '12 Lê Lợi, Q1', 'CONFIRMED')",
                     (db["application"],))


def test_postgres_repository_end_to_end(db, monkeypatch):
    """The adapter's SQL and error mapping (what InMemory cannot catch), through the savepoint stand-in of user_tx."""
    monkeypatch.setattr("app.modules.interviews.postgres.user_tx", _savepoint_tx(db["conn"]))

    def repo(who, role):
        return PostgresInterviewRepository(_claims(who)), Actor(user_id=str(who), role=role, claims=_claims(who),
                                                                 token="t")

    emp, emp_actor = repo(db["employer"], "EMPLOYER")
    cand, cand_actor = repo(db["candidate"], "CANDIDATE")
    other, other_actor = repo(db["other_candidate"], "CANDIDATE")
    data = InterviewInput(scheduled_at=TOMORROW, duration_minutes=45, mode="ONSITE", location="12 Lê Lợi, Q1")

    interview = emp.schedule(emp_actor, db["application"], data)
    assert (interview.status, interview.company_name, interview.candidate_name, interview.posting_id) == \
        ("PROPOSED", "Cty Phỏng Vấn", "Ứng Viên Phỏng Vấn", db["posting"])
    with pytest.raises(InterviewError) as err:
        emp.schedule(emp_actor, db["application"], data)
    assert err.value.code == "INTERVIEW_ALREADY_PENDING"

    assert cand.respond(cand_actor, interview.id, "CONFIRM", None).status == "CONFIRMED"
    with pytest.raises(InterviewError) as err:
        emp.mark_done(emp_actor, interview.id)
    assert err.value.code == "INTERVIEW_NOT_DUE"

    assert [i.id for i in cand.list_mine(cand_actor, "upcoming")] == [interview.id]
    assert emp.list_mine(emp_actor, "past") == []
    assert other.list_mine(other_actor, "upcoming") == []
    assert [i.id for i in emp.list_for_application(emp_actor, db["application"])] == [interview.id]
    assert other.list_for_application(other_actor, db["application"]) is None

    assert emp.cancel(emp_actor, interview.id, CancelInput(reason="Đổi kế hoạch")).status == "CANCELLED"
