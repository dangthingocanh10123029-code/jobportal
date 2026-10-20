"""Ticket 41 on the real DB: who may read/send/mark read, closed Applications, rate limit, conversations view, RLS.

Each test runs in its own transaction, always rolled back. Run: RUN_INTEGRATION=1 uv run pytest -m integration
"""

import os

import psycopg
import pytest
from psycopg import errors

from app.auth import Actor
from app.modules.messages.domain import MessageError
from app.modules.messages.postgres import PostgresMessageRepository
from tests.integration.conftest import apply_admin_migration, apply_messages_migration
from tests.integration.test_admin_rpc import _as, _refused, _signup
from tests.integration.test_postgres_reads import _claims, _savepoint_tx

DATABASE_URL = os.environ.get("INTEGRATION_DATABASE_URL")
pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(not DATABASE_URL, reason="needs RUN_INTEGRATION=1 and DATABASE_URL"),
]

SEND = "select id, sender_id, body from public.send_message(%s, %s)"
READ = "select public.mark_conversation_read(%s)"


@pytest.fixture
def db():
    with psycopg.connect(DATABASE_URL) as conn, conn.transaction(force_rollback=True):
        apply_admin_migration(conn)
        apply_messages_migration(conn)
        employer = _signup(conn, {"role": "EMPLOYER", "company_name": "Cty Nhắn Tin"})
        other_employer = _signup(conn, {"role": "EMPLOYER", "company_name": "Cty Khác"})
        candidate = _signup(conn, {"role": "CANDIDATE", "full_name": "Ứng Viên Nhắn Tin"})
        other_candidate = _signup(conn, {"role": "CANDIDATE", "full_name": "Ứng Viên Khác"})
        (posting,) = conn.execute(
            """insert into public.job_postings (employer_id, title, description, location, employment_type,
                 application_deadline, status)
               values (%s, 'Tin nhắn tin', 'Mô tả tin tuyển dụng cho test nhắn tin.', 'Hà Nội', 'FULL_TIME',
                 now() + interval '30 days', 'PUBLISHED') returning id""",
            (employer,),
        ).fetchone()
        apps = []
        for who in (candidate, other_candidate):
            resume = f"{who}/cv.pdf"
            conn.execute("insert into storage.objects (bucket_id, name) values ('resumes', %s)", (resume,))
            apps.append(conn.execute(
                "insert into public.applications (job_posting_id, candidate_id, resume_path) values (%s, %s, %s) "
                "returning id", (posting, who, resume)).fetchone()[0])
        yield {"conn": conn, "employer": employer, "other_employer": other_employer, "candidate": candidate,
               "other_candidate": other_candidate, "application": apps[0], "other_application": apps[1]}


def _send(db, who, body="Chào bạn", application=None):
    with _as(db["conn"], who):
        return db["conn"].execute(SEND, (application or db["application"], body)).fetchone()


def _count(conn, who, query, params=()):
    with _as(conn, who):
        return conn.execute(query, params).fetchone()[0]


def test_both_sides_send_and_only_they_read(db):
    conn = db["conn"]
    _, sender, body = _send(db, db["employer"], "  Mời bạn phỏng vấn  ")
    assert (sender, body) == (db["employer"], "Mời bạn phỏng vấn")
    _send(db, db["candidate"], "Dạ vâng")
    for who in (db["employer"], db["candidate"]):
        assert _count(conn, who, "select count(*) from public.messages") == 2
    for who in (db["other_employer"], db["other_candidate"]):
        assert _count(conn, who, "select count(*) from public.messages") == 0
        assert _count(conn, who, "select count(*) from public.conversations where application_id = %s",
                      (db["application"],)) == 0
    for who in (db["other_employer"], db["other_candidate"]):
        assert _refused(conn, who, SEND, (db["application"], "x")) == "APPLICATION_NOT_FOUND"
        assert _refused(conn, who, READ, (db["application"],)) == "APPLICATION_NOT_FOUND"
    for stmt in (SEND, "select count(*) from public.messages", "select count(*) from public.conversations"):
        _refused(conn, None, stmt, (db["application"], "x") if stmt == SEND else (), errors.InsufficientPrivilege)


def test_users_cannot_write_messages_directly(db):
    conn = db["conn"]
    (message, _, _) = _send(db, db["employer"])
    for who, stmt, params in [
        (db["candidate"], "update public.messages set read_at = now() where id = %s", (message,)),
        (db["employer"], "delete from public.messages where id = %s", (message,)),
        (db["employer"], "insert into public.messages (application_id, sender_id, body) values (%s, %s, 'x')",
         (db["application"], db["employer"])),
    ]:
        _refused(conn, who, stmt, params, errors.InsufficientPrivilege)


@pytest.mark.parametrize("body", ["", "   ", "x" * 2001, None])
def test_body_must_be_1_to_2000_after_trim(db, body):
    assert _refused(db["conn"], db["candidate"], SEND, (db["application"], body)) == "INVALID_MESSAGE"


def test_table_check_guards_untrimmed_body(db):
    with pytest.raises(errors.CheckViolation):
        db["conn"].execute("insert into public.messages (application_id, sender_id, body) values (%s, %s, ' x ')",
                           (db["application"], db["candidate"]))


@pytest.mark.parametrize("path", [("WITHDRAWN",), ("REJECTED",), ("REVIEWING", "INTERVIEWING", "OFFERED", "HIRED")])
def test_closed_application_blocks_sending_but_not_reading(db, path):
    conn = db["conn"]
    _send(db, db["employer"])
    for status in path:  # as postgres: applications_guard still checks each transition
        conn.execute("update public.applications set status = %s where id = %s", (status, db["application"]))
    for who in (db["employer"], db["candidate"]):
        assert _refused(conn, who, SEND, (db["application"], "x")) == "CONVERSATION_CLOSED"
    with _as(conn, db["candidate"]):
        assert conn.execute("select can_send, last_message from public.conversations where application_id = %s",
                            (db["application"],)).fetchone() == (False, "Chào bạn")
        conn.execute(READ, (db["application"],))


def test_rate_limit_30_per_minute_per_sender(db):
    conn = db["conn"]
    for i in range(30):
        _send(db, db["candidate"], f"m{i}")
    assert _refused(conn, db["candidate"], SEND, (db["application"], "x")) == "MESSAGE_RATE_LIMITED"
    _send(db, db["employer"])  # the limit is per sender
    conn.execute("update public.messages set created_at = created_at - interval '2 minutes' where sender_id = %s",
                 (db["candidate"],))
    _send(db, db["candidate"], "lại được rồi")


def test_conversations_view_unread_and_mark_read(db):
    conn = db["conn"]
    conn.execute("update public.companies set logo_url = '/images/companies/logo-01.svg' where id = %s",
                 (db["employer"],))
    _send(db, db["employer"], "1")
    _send(db, db["employer"], "2")
    _send(db, db["candidate"], "Dạ")
    with _as(conn, db["candidate"]):
        assert conn.execute(
            "select posting_title, other_party_name, other_party_logo_url, last_message, unread, can_send "
            "from public.conversations").fetchall() == \
            [("Tin nhắn tin", "Cty Nhắn Tin", "/images/companies/logo-01.svg", "Dạ", 2, True)]
    with _as(conn, db["employer"]):
        rows = conn.execute("select application_id, other_party_name, other_party_logo_url, unread "
                            "from public.conversations order by sort_at desc").fetchall()
        assert rows == [(db["application"], "Ứng Viên Nhắn Tin", None, 1),
                        (db["other_application"], "Ứng Viên Khác", None, 0)]
    with _as(conn, db["candidate"]):
        conn.execute(READ, (db["application"],))
    assert _count(conn, db["candidate"], "select count(*) from public.messages where read_at is null "
                  "and sender_id <> auth.uid()") == 0
    assert _count(conn, db["employer"], "select count(*) from public.messages where read_at is null "
                  "and sender_id <> auth.uid()") == 1
    # No notification per message (only the fixture's APPLICATION_RECEIVED).
    assert conn.execute("select count(*) from public.notifications where recipient_id in (%s, %s) "
                        "and type <> 'APPLICATION_RECEIVED'", (db["employer"], db["candidate"])).fetchone() == (0,)


def test_postgres_repository_end_to_end(db, monkeypatch):
    """The adapter's SQL, paging and error mapping (what InMemory cannot catch), through the savepoint stand-in."""
    monkeypatch.setattr("app.modules.messages.postgres.user_tx", _savepoint_tx(db["conn"]))

    def repo(who, role):
        return PostgresMessageRepository(_claims(who)), Actor(user_id=str(who), role=role, claims=_claims(who),
                                                               token="t")

    emp, emp_actor = repo(db["employer"], "EMPLOYER")
    cand, cand_actor = repo(db["candidate"], "CANDIDATE")
    other, other_actor = repo(db["other_candidate"], "CANDIDATE")

    for i in range(25):
        emp.send(emp_actor, db["application"], f"e{i}")
        cand.send(cand_actor, db["application"], f"c{i}")
    last = cand.send(cand_actor, db["application"], "cuối")
    assert (last.mine, last.body) == (True, "cuối")
    with pytest.raises(MessageError) as err:
        other.send(other_actor, db["application"], "x")
    assert err.value.code == "APPLICATION_NOT_FOUND"

    page = emp.get_page(emp_actor, db["application"], None)
    assert (len(page.messages), page.has_more) == (50, True)
    assert page.messages[-1].body == "cuối" and page.messages[-1].mine is False
    assert page.messages[0].created_at < page.messages[-1].created_at
    assert (page.conversation.unread, page.conversation.other_party_name) == (26, "Ứng Viên Nhắn Tin")
    older = emp.get_page(emp_actor, db["application"], page.messages[0].created_at)
    assert ([m.body for m in older.messages], older.has_more) == (["e0"], False)
    assert other.get_page(other_actor, db["application"], None) is None

    assert emp.unread_count(emp_actor) == 26
    emp.mark_read(emp_actor, db["application"])
    assert emp.unread_count(emp_actor) == 0
    assert cand.unread_count(cand_actor) == 25

    assert [c.application_id for c in emp.list_conversations(emp_actor)] == \
        [db["application"], db["other_application"]]
    assert [c.application_id for c in other.list_conversations(other_actor)] == [db["other_application"]]
