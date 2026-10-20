"""Ticket 42 on the real DB: candidate_cvs RLS and CHECKs, submit_application with the ONLINE source, snapshots.

Each test runs in its own transaction, always rolled back. Run: RUN_INTEGRATION=1 uv run pytest -m integration
"""

import json
import os

import psycopg
import pytest
from psycopg import errors

from app.modules.applications.postgres import PostgresApplicationRepository
from app.modules.cv.domain import CvError
from app.modules.cv.postgres import PostgresCvRepository
from app.modules.cv.schemas import CvInput
from tests.integration.conftest import apply_admin_migration, apply_online_cv_migration
from tests.integration.test_admin_rpc import _as, _refused, _signup
from tests.integration.test_postgres_reads import _claims, _savepoint_tx

DATABASE_URL = os.environ.get("INTEGRATION_DATABASE_URL")
pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(not DATABASE_URL, reason="needs RUN_INTEGRATION=1 and DATABASE_URL"),
]

SUBMIT = "select cv_source, resume_path, online_cv from public.submit_application(%s, %s, %s)"
CV = CvInput.model_validate({
    "template": "CLASSIC", "fullName": "Ứng Viên CV", "email": "cv@example.vn", "headline": "Kế toán",
    "experiences": [{"title": "Kế toán", "organization": "ACME", "startDate": "2020-01", "endDate": None,
                     "description": ""}],
    "educations": [], "skills": ["Excel"], "languages": [], "certifications": [{"name": "ACCA", "year": 2022}],
})


@pytest.fixture
def db(monkeypatch):
    with psycopg.connect(DATABASE_URL) as conn, conn.transaction(force_rollback=True):
        apply_admin_migration(conn)
        apply_online_cv_migration(conn)
        monkeypatch.setattr("app.modules.cv.postgres.user_tx", _savepoint_tx(conn))
        monkeypatch.setattr("app.modules.applications.postgres.user_tx", _savepoint_tx(conn))
        employer = _signup(conn, {"role": "EMPLOYER", "company_name": "Cty CV"})
        other_employer = _signup(conn, {"role": "EMPLOYER", "company_name": "Cty Khác"})
        candidate = _signup(conn, {"role": "CANDIDATE", "full_name": "Ứng Viên CV"})
        other_candidate = _signup(conn, {"role": "CANDIDATE", "full_name": "Ứng Viên Khác"})
        (posting,) = conn.execute(
            """insert into public.job_postings (employer_id, title, description, location, employment_type,
                 application_deadline, status)
               values (%s, 'Tin CV online', 'Mô tả tin tuyển dụng cho test CV online.', 'Hà Nội', 'FULL_TIME',
                 now() + interval '30 days', 'PUBLISHED') returning id""",
            (employer,),
        ).fetchone()
        yield {"conn": conn, "employer": employer, "other_employer": other_employer, "candidate": candidate,
               "other_candidate": other_candidate, "posting": posting}


def _repo(who):
    return PostgresCvRepository(_claims(who))


def test_cv_is_owner_only_and_candidate_only(db):
    conn = db["conn"]
    saved = _repo(db["candidate"]).save(db["candidate"], CV)
    assert (saved.candidate_id, saved.experiences[0].start_date, saved.certifications[0].year) == \
        (db["candidate"], "2020-01", 2022)
    again = _repo(db["candidate"]).save(db["candidate"], CV.model_copy(update={"template": "MODERN"}))
    assert again.template == "MODERN" and again.updated_at >= saved.updated_at
    assert _repo(db["candidate"]).get(db["candidate"]).template == "MODERN"
    for who in (db["other_candidate"], db["employer"]):
        assert _repo(who).get(db["candidate"]) is None
    with pytest.raises(errors.InsufficientPrivilege):  # RLS with check: an Employer has no CV
        _repo(db["employer"]).save(db["employer"], CV)
    with pytest.raises(errors.InsufficientPrivilege):  # nor writes someone else's
        _repo(db["other_candidate"]).save(db["candidate"], CV)
    _repo(db["other_candidate"]).delete(db["candidate"])
    assert _repo(db["candidate"]).get(db["candidate"]) is not None
    _refused(conn, None, "select count(*) from public.candidate_cvs", exc=errors.InsufficientPrivilege)
    _repo(db["candidate"]).delete(db["candidate"])
    assert _repo(db["candidate"]).get(db["candidate"]) is None


@pytest.mark.parametrize(
    ("column", "value"),
    [("experiences", json.dumps([{}] * 16)), ("certifications", '{"a": 1}'), ("skills", ["x"] * 31),
     ("languages", ["x"] * 11), ("email", "not-an-email"), ("template", "FANCY"), ("summary", "x" * 2001)],
)
def test_table_checks_hold_the_contract_sizes(db, column, value):
    conn = db["conn"]
    row = {"template": "CLASSIC", "full_name": "A", "email": "a@b.vn", column: value}
    with pytest.raises(errors.CheckViolation), _as(conn, db["candidate"]):
        conn.execute(f"insert into public.candidate_cvs (candidate_id, {', '.join(row)}) "
                     f"values (auth.uid(), {', '.join(['%s'] * len(row))})", list(row.values()))


def test_submit_online_snapshots_the_cv(db):
    conn = db["conn"]
    args = (db["posting"], None, "ONLINE")
    assert _refused(conn, db["candidate"], SUBMIT, args) == "CV_NOT_FOUND"
    _repo(db["candidate"]).save(db["candidate"], CV)
    assert _refused(conn, db["candidate"], SUBMIT, (db["posting"], f"{db['candidate']}/cv.pdf", "ONLINE")) == \
        "CV_NOT_FOUND"
    assert _refused(conn, db["candidate"], SUBMIT, (db["posting"], None, "LINK")) == "INVALID_RESUME"

    app = PostgresApplicationRepository(_claims(db["candidate"])).submit(db["candidate"], db["posting"], None)
    assert (app.cv_source, app.status) == ("ONLINE", "SUBMITTED")
    _repo(db["candidate"]).save(db["candidate"], CV.model_copy(update={"full_name": "Tên Mới"}))
    _repo(db["candidate"]).delete(db["candidate"])

    snapshot = _repo(db["employer"]).application_cv(db["employer"], app.id)
    assert (snapshot.full_name, snapshot.candidate_id, snapshot.experiences[0].organization) == \
        ("Ứng Viên CV", db["candidate"], "ACME")
    with pytest.raises(CvError):
        _repo(db["other_employer"]).application_cv(db["other_employer"], app.id)
    with pytest.raises(CvError):  # the Candidate is not the Employer of the posting
        _repo(db["candidate"]).application_cv(db["candidate"], app.id)
    summaries = PostgresApplicationRepository(_claims(db["employer"])).list_by_posting(db["employer"], db["posting"])
    assert [s.cv_source for s in summaries] == ["ONLINE"]
    assert PostgresApplicationRepository(_claims(db["candidate"])).list_by_candidate(db["candidate"])[0].cv_source == \
        "ONLINE"

    # The snapshot and source are fixed, even for postgres (the repos' savepoints leave the role set).
    conn.execute("reset role")
    with pytest.raises(errors.CheckViolation):
        conn.execute("update public.applications set online_cv = '{}' where id = %s", (app.id,))


def test_file_application_has_no_snapshot(db):
    conn = db["conn"]
    resume = f"{db['other_candidate']}/cv.pdf"
    conn.execute("insert into storage.objects (bucket_id, name) values ('resumes', %s)", (resume,))
    with _as(conn, db["other_candidate"]):
        (source, path, snapshot) = conn.execute(
            "select cv_source, resume_path, online_cv from public.submit_application(%s, %s)", (db["posting"], resume)
        ).fetchone()
    assert (source, path, snapshot) == ("FILE", resume, None)
    (app,) = conn.execute("select id from public.applications where candidate_id = %s",
                          (db["other_candidate"],)).fetchone()
    assert _repo(db["employer"]).application_cv(db["employer"], app) is None
    conn.execute("reset role")
    with pytest.raises(errors.CheckViolation):  # exactly one CV source per Application
        conn.execute("insert into public.applications (job_posting_id, candidate_id, resume_path, cv_source) "
                     "values (%s, %s, %s, 'ONLINE')", (db["posting"], db["candidate"], resume))
