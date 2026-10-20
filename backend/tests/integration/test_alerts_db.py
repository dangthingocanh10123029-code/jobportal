"""Ticket 44 on the real DB: job_alerts RLS + limit, the JOB_ALERT trigger on publish, recommended_postings().

Each test runs in its own transaction, always rolled back. Run: RUN_INTEGRATION=1 uv run pytest -m integration
"""

import os

import psycopg
import pytest
from psycopg import errors

from app.modules.alerts.domain import AlertError
from app.modules.alerts.postgres import PostgresAlertRepository
from app.modules.alerts.schemas import JobAlertInput
from tests.integration.conftest import apply_admin_migration, apply_alerts_migration
from tests.integration.test_admin_rpc import _as, _refused, _signup
from tests.integration.test_postgres_reads import _claims, _savepoint_tx

DATABASE_URL = os.environ.get("INTEGRATION_DATABASE_URL")
pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(not DATABASE_URL, reason="needs RUN_INTEGRATION=1 and DATABASE_URL"),
]

POSTING = """insert into public.job_postings (employer_id, title, description, location, employment_type,
               application_deadline, status, industry, skills, salary_max)
             values (%s, %s, 'Mô tả tin tuyển dụng cho test thông báo việc làm.', %s, 'FULL_TIME',
               now() + interval '30 days', %s, %s, %s, %s) returning id"""


@pytest.fixture
def db(monkeypatch):
    with psycopg.connect(DATABASE_URL) as conn, conn.transaction(force_rollback=True):
        apply_admin_migration(conn)
        apply_alerts_migration(conn)
        monkeypatch.setattr("app.modules.alerts.postgres.user_tx", _savepoint_tx(conn))
        employer = _signup(conn, {"role": "EMPLOYER", "company_name": "Cty Báo Việc"})
        candidate = _signup(conn, {"role": "CANDIDATE", "full_name": "Ứng Viên Báo Việc"})
        other = _signup(conn, {"role": "CANDIDATE", "full_name": "Ứng Viên Khác"})
        conn.execute("update public.profiles set skills = '{excel,Misa}', location = 'Hà Nội' where id = %s",
                     (candidate,))
        yield {"conn": conn, "employer": employer, "candidate": candidate, "other": other}


def _sql(db, query, params=()):
    """As postgres: the repos' savepoints leave the role set."""
    db["conn"].execute("reset role")
    return db["conn"].execute(query, params)


def _posting(db, title, *, location="Đà Nẵng", status="PUBLISHED", industry="OTHER", skills=(), salary_max=None):
    (posting,) = _sql(db, 
        POSTING, (db["employer"], title, location, status, industry, list(skills), salary_max)).fetchone()
    return posting


def _repo(who):
    return PostgresAlertRepository(_claims(who))


def _alert(who, name, **filter_):
    return _repo(who).create(who, JobAlertInput.model_validate({"name": name, "filter": filter_}))


def _alert_notifications(db, who):
    return _sql(
        db, "select link, body from public.notifications where recipient_id = %s and type = 'JOB_ALERT' order by link",
        (who,)).fetchall()


def test_alerts_are_own_candidate_only_and_limited(db):
    conn, me, other = db["conn"], db["candidate"], db["other"]
    alert = _alert(me, "Kế toán", q="kế toán", minSalary=10_000_000)
    assert alert.filter == {"q": "kế toán", "minSalary": 10_000_000} and alert.active
    assert _repo(other).list(other) == [] and _repo(me).list(me) == [alert]
    assert _repo(other).set_active(other, alert.id, False) is None
    assert _repo(other).delete(other, alert.id) is False
    assert _repo(me).set_active(me, alert.id, False).active is False

    assert "row-level security" in _refused(
        conn, db["employer"], "insert into public.job_alerts (candidate_id, name, filter) "
        "values (auth.uid(), 'x', '{\"q\": \"x\"}')", exc=errors.InsufficientPrivilege)
    _refused(conn, me, "insert into public.job_alerts (candidate_id, name, filter) values (%s, 'x', '{\"q\": \"x\"}')",
             (other,), exc=errors.InsufficientPrivilege)
    _refused(conn, me, "update public.job_alerts set last_matched_at = now()", exc=errors.InsufficientPrivilege)
    for bad in ('{}', '{"skill": "x"}', '{"minSalary": 0}', '{"level": "BOSS"}', '{"q": " "}'):
        _refused(conn, me, "insert into public.job_alerts (candidate_id, name, filter) values (auth.uid(), 'x', %s)",
                 (bad,), exc=errors.CheckViolation)

    for i in range(4):
        _alert(me, f"A{i}", q="excel")
    with pytest.raises(AlertError) as err:
        _alert(me, "A5", q="excel")
    assert err.value.code == "ALERT_LIMIT"
    assert _repo(me).delete(me, alert.id) is True
    _alert(me, "A5", q="excel")  # room again after a delete


def test_publish_notifies_matching_active_alerts_once(db):
    conn, me, other = db["conn"], db["candidate"], db["other"]
    hit = _alert(me, "Kế toán HN", q="ke toan", location="ha noi", minSalary=20_000_000)
    _alert(me, "IT", industry="IT_SOFTWARE")
    off = _alert(other, "Kế toán", q="kế toán")
    _repo(other).set_active(other, off.id, False)

    draft = _posting(db, "Kế toán tổng hợp", location="Quận 1, Hà Nội", status="DRAFT", salary_max=None)
    assert _alert_notifications(db, me) == []  # drafts notify no one
    with _as(conn, db["employer"]):
        conn.execute("update public.job_postings set status = 'PUBLISHED' where id = %s", (draft,))
    _posting(db, "Kế toán lương thấp", location="Hà Nội", salary_max=5_000_000)  # below minSalary
    _posting(db, "Kế toán Đà Nẵng")  # wrong location

    [(link, body)] = _alert_notifications(db, me)
    assert link == f"/jobs/{draft}" and "Kế toán tổng hợp" in body and "Kế toán HN" in body
    assert _alert_notifications(db, other) == []
    assert [a.last_matched_at is not None for a in _repo(me).list(me)] == [False, True]
    assert _repo(me).list(me)[1].id == hit.id

    with _as(conn, db["employer"]):  # editing or closing an open posting does not notify again
        conn.execute("update public.job_postings set title = 'Kế toán tổng hợp HN' where id = %s", (draft,))
        conn.execute("update public.job_postings set status = 'CLOSED' where id = %s", (draft,))
    assert len(_alert_notifications(db, me)) == 1


def test_locked_candidate_gets_no_alert(db):
    me = db["candidate"]
    _alert(me, "Excel", q="excel")
    _sql(db, "update public.profiles set locked_at = now(), locked_reason = 'Vi phạm quy định' where id = %s",
         (me,))
    _posting(db, "Nhân viên Excel")
    assert _alert_notifications(db, me) == []


def test_recommendations(db):
    conn, me = db["conn"], db["candidate"]
    # Other open postings on the shared DB would compete for the 10 slots.
    _sql(db, "update public.job_postings set hidden_at = now(), hidden_reason = 'Ẩn cho test gợi ý' "
             "where hidden_at is null")
    applied = _posting(db, "Đã nộp", location="Cần Thơ", industry="ACCOUNTING_FINANCE", skills=["Excel"])
    _sql(db, "insert into public.applications (job_posting_id, candidate_id, resume_path) values (%s, %s, %s)",
         (applied, me, f"{me}/cv.pdf"))
    _sql(db, "update public.job_postings set status = 'CLOSED' where id = %s", (applied,))  # still counts
    skills = _posting(db, "Kế toán Excel", location="Hà Nội", skills=["Excel", "MISA", "Word"])
    industry = _posting(db, "Kế toán thuế", industry="ACCOUNTING_FINANCE")
    near = _posting(db, "Lễ tân Cần Thơ", location="Cần Thơ")
    unrelated = _posting(db, "Lập trình viên", skills=["Python"])
    draft = _posting(db, "Nháp Excel", status="DRAFT", skills=["Excel"])

    got = {p.id: p for p in _repo(me).recommendations(me)}
    assert applied not in got and unrelated not in got and draft not in got
    ranked = [p.id for p in _repo(me).recommendations(me) if p.id in {skills, industry, near}]
    assert ranked == [skills, industry, near]
    assert got[skills].match_reasons == ["Khớp kỹ năng: Excel, MISA", "Địa điểm phù hợp: Hà Nội"]
    assert got[industry].match_reasons == ["Cùng ngành với việc bạn đã ứng tuyển"]
    assert got[near].match_reasons == ["Địa điểm phù hợp: Cần Thơ"]
    assert got[skills].company_name == "Cty Báo Việc"

    assert _repo(db["employer"]).recommendations(db["employer"]) == []
    _refused(conn, None, "select * from public.recommended_postings()", exc=errors.InsufficientPrivilege)
