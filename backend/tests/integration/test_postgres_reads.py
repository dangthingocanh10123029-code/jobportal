"""Every read method of every Postgres adapter against the real DB (SQL errors the InMemory tests cannot catch).

One transaction per module, always rolled back: temporary users and rows never persist.
Run: RUN_INTEGRATION=1 uv run pytest -m integration
"""

import json
import os
from contextlib import contextmanager
from uuid import UUID, uuid4

import psycopg
import pytest

from app.modules.applications.postgres import PostgresApplicationRepository
from app.modules.applications.schemas import (
    CandidateApplicationSummary,
    EmployerApplicationSummary,
    StatusChange,
)
from app.modules.candidates.postgres import PostgresCandidateRepository
from app.modules.companies.postgres import PostgresCompanyRepository
from app.modules.dashboard.postgres import PostgresDashboardRepository
from app.modules.notifications.postgres import PostgresNotificationRepository
from app.modules.postings.postgres import PostgresPostingRepository
from app.modules.postings.schemas import SearchFilter
from app.modules.profiles.postgres import PostgresProfileRepository
from tests.integration.conftest import (
    apply_admin_migration,
    apply_online_cv_migration,
    apply_reviews_migration,
    apply_talent_migration,
)

DATABASE_URL = os.environ.get("INTEGRATION_DATABASE_URL")
pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(not DATABASE_URL, reason="needs RUN_INTEGRATION=1 and DATABASE_URL"),
]

ADAPTERS = ["applications", "candidates", "companies", "dashboard", "notifications", "postings", "profiles"]


def _savepoint_tx(conn):
    """Stands in for user_tx (whose COMMIT would end the test transaction): same role/claims setup, as a savepoint.

    user_tx itself is covered by test_user_tx.py.
    """

    @contextmanager
    def tx(claims, pool=None):
        with conn.transaction():
            conn.execute(
                "select set_config('role', %s, true), set_config('request.jwt.claims', %s, true)",
                ("authenticated" if claims else "anon", json.dumps(claims or {"role": "anon"})),
            )
            yield conn

    return tx


def _claims(user_id: UUID) -> dict:
    return {"sub": str(user_id), "role": "authenticated"}


@pytest.fixture(scope="module")
def seed():
    with psycopg.connect(DATABASE_URL) as conn, conn.transaction(force_rollback=True), pytest.MonkeyPatch.context() as mp:
        apply_admin_migration(conn)
        apply_online_cv_migration(conn)
        apply_reviews_migration(conn)  # company_summaries.rating (45)
        apply_talent_migration(conn)
        employer, candidate = uuid4(), uuid4()
        for user_id, meta in [
            (employer, '{"role": "EMPLOYER", "company_name": "Cty Tích Hợp"}'),
            (candidate, '{"role": "CANDIDATE", "full_name": "Ứng Viên Tích Hợp"}'),
        ]:
            conn.execute(
                "insert into auth.users (id, email, raw_user_meta_data) values (%s, %s, %s)",
                (user_id, f"it-{user_id}@example.test", meta),
            )
        (posting,) = conn.execute(
            """insert into public.job_postings (employer_id, title, description, location, employment_type,
                 salary_max, application_deadline, status)
               values (%s, 'Kỹ sư tích hợp', 'Mô tả tin tuyển dụng cho test tích hợp.', 'Hà Nội', 'FULL_TIME',
                 20000000, now() + interval '30 days', 'PUBLISHED') returning id""",
            (employer,),
        ).fetchone()
        conn.execute("insert into public.saved_postings (candidate_id, posting_id) values (%s, %s)", (candidate, posting))
        (application,) = conn.execute(
            "insert into public.applications (job_posting_id, candidate_id, resume_path) values (%s, %s, %s) returning id",
            (posting, candidate, f"{candidate}/cv.pdf"),
        ).fetchone()
        conn.execute(
            """insert into public.application_status_changes (application_id, to_status, changed_by, changed_by_role)
               values (%s, 'SUBMITTED', %s, 'CANDIDATE')""",
            (application, candidate),
        )
        tx = _savepoint_tx(conn)
        for name in ADAPTERS:
            mp.setattr(f"app.modules.{name}.postgres.user_tx", tx)
        yield {"employer": employer, "candidate": candidate, "posting": posting, "application": application}


def test_applications(seed):
    as_candidate = PostgresApplicationRepository(_claims(seed["candidate"]))
    as_employer = PostgresApplicationRepository(_claims(seed["employer"]))
    assert as_candidate.find_by_posting(seed["candidate"], seed["posting"]).id == seed["application"]
    [change] = as_candidate.list_status_changes(seed["application"])
    assert isinstance(change, StatusChange) and (change.from_status, change.to_status) == (None, "SUBMITTED")
    [mine] = as_candidate.list_by_candidate(seed["candidate"])
    assert isinstance(mine, CandidateApplicationSummary) and mine.company_name == "Cty Tích Hợp"
    [theirs] = as_employer.list_by_posting(seed["employer"], seed["posting"])
    assert isinstance(theirs, EmployerApplicationSummary) and theirs.candidate_name == "Ứng Viên Tích Hợp"
    assert as_candidate.list_by_posting(seed["candidate"], seed["posting"]) is None
    assert as_employer.find_resume_path(seed["employer"], seed["application"]) == f"{seed['candidate']}/cv.pdf"


def test_candidates(seed):
    repo = PostgresCandidateRepository(_claims(seed["candidate"]))
    assert repo.profile(str(seed["candidate"])).full_name == "Ứng Viên Tích Hợp"
    applicant = PostgresCandidateRepository(_claims(seed["employer"])).applicant_profile(str(seed["application"]))
    assert applicant.full_name == "Ứng Viên Tích Hợp"
    [saved] = repo.saved(str(seed["candidate"]))
    assert saved["id"] == str(seed["posting"]) and saved["companyName"] == "Cty Tích Hợp"
    assert saved["isOpen"] is True and saved["savedAt"]
    assert repo.saved_ids(str(seed["candidate"])) == [str(seed["posting"])]


def test_companies(seed):
    repo = PostgresCompanyRepository(None)
    assert repo.get(str(seed["employer"])).name == "Cty Tích Hợp"
    summaries, total = repo.list("cty tich hop", 0, 20)
    assert total >= 1 and any(s.company.name == "Cty Tích Hợp" and s.open_postings == 1 for s in summaries)
    assert repo.list(None, 0, 1)[1] >= total
    [posting] = repo.open_postings(str(seed["employer"]))
    assert posting["id"] == str(seed["posting"]) and posting["skills"] == []


def test_dashboard(seed):
    [stats] = PostgresDashboardRepository(_claims(seed["employer"])).posting_stats(str(seed["employer"]))
    assert stats.id == str(seed["posting"]) and stats.views == 0
    assert stats.applications_by_status.get("SUBMITTED") == 1


def test_notifications(seed):
    repo = PostgresNotificationRepository(_claims(seed["employer"]))
    [received] = repo.recent(str(seed["employer"]), 30)
    assert received.type == "APPLICATION_RECEIVED" and received.read_at is None
    assert repo.unread_count(str(seed["employer"])) == 1


def test_postings(seed):
    repo = PostgresPostingRepository(_claims(seed["employer"]))
    assert repo.find_by_id(seed["posting"]).company_name == "Cty Tích Hợp"
    assert [p.id for p in repo.list_by_employer(seed["employer"])] == [seed["posting"]]
    anon = PostgresPostingRepository(None)
    every_filter = SearchFilter(
        q="ky su tich hop", location="ha noi", employment_type="FULL_TIME", min_salary=1, industry="OTHER",
        level="JUNIOR", max_experience=0, skill="python", sort="salary_desc",
    )
    assert anon.list_open(every_filter, 0, 20) == ([], 0)  # the seeded posting has no skills
    rows, total = anon.list_open(SearchFilter(q="ky su tich hop", sort="deadline_asc"), 0, 20)
    assert total >= 1 and seed["posting"] in [p.id for p in rows]
    assert anon.list_open(SearchFilter(q="ky su tich hop"), 1000, 20) == ([], total)  # page past the end


def test_profiles(seed):
    profile = PostgresProfileRepository(_claims(seed["employer"])).get(str(seed["employer"]))
    assert profile.role == "EMPLOYER" and profile.company_name == "Cty Tích Hợp"
