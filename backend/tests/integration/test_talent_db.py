"""Ticket 43 on the real DB: talent_profiles visibility (no email/phone), saved_candidates RLS, invite_talent.

Each test runs in its own transaction, always rolled back. Run: RUN_INTEGRATION=1 uv run pytest -m integration
"""

import os

import psycopg
import pytest
from psycopg import errors

from app.modules.candidates.postgres import PostgresCandidateRepository
from app.modules.cv.postgres import PostgresCvRepository
from app.modules.cv.schemas import CvInput
from app.modules.talent.domain import TalentError
from app.modules.talent.postgres import PostgresTalentRepository
from app.modules.talent.schemas import OpenToWorkInput, TalentQuery
from tests.integration.conftest import apply_admin_migration, apply_talent_migration
from tests.integration.test_admin_rpc import _as, _refused, _signup
from tests.integration.test_postgres_reads import _claims, _savepoint_tx

DATABASE_URL = os.environ.get("INTEGRATION_DATABASE_URL")
pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(not DATABASE_URL, reason="needs RUN_INTEGRATION=1 and DATABASE_URL"),
]

CV = CvInput.model_validate({
    "template": "CLASSIC", "fullName": "Ứng Viên Tài Năng", "email": "talent-secret@example.vn",
    "phone": "0909999888", "experiences": [], "educations": [], "skills": ["Excel"], "languages": [],
    "certifications": [],
})
POSTING = """insert into public.job_postings (employer_id, title, description, location, employment_type,
               application_deadline, status)
             values (%s, 'Tin tìm ứng viên', 'Mô tả tin tuyển dụng cho test tìm ứng viên.', 'Hà Nội', 'FULL_TIME',
               now() + interval '30 days', %s) returning id"""


@pytest.fixture
def db(monkeypatch):
    with psycopg.connect(DATABASE_URL) as conn, conn.transaction(force_rollback=True):
        apply_admin_migration(conn)
        apply_talent_migration(conn)
        for module in ("talent", "cv", "candidates"):
            monkeypatch.setattr(f"app.modules.{module}.postgres.user_tx", _savepoint_tx(conn))
        employer = _signup(conn, {"role": "EMPLOYER", "company_name": "Cty Săn Đầu Người"})
        other_employer = _signup(conn, {"role": "EMPLOYER", "company_name": "Cty Khác"})
        candidate = _signup(conn, {"role": "CANDIDATE", "full_name": "Ứng Viên Tài Năng"})
        hidden = _signup(conn, {"role": "CANDIDATE", "full_name": "Ứng Viên Ẩn Mình"})
        conn.execute("update public.profiles set phone = '0909999888', skills = '{Kế toán,Excel}' where id = %s",
                     (candidate,))
        (posting,) = conn.execute(POSTING, (employer, "PUBLISHED")).fetchone()
        (draft,) = conn.execute(POSTING, (employer, "DRAFT")).fetchone()
        (other_posting,) = conn.execute(POSTING, (other_employer, "PUBLISHED")).fetchone()
        repo = PostgresTalentRepository(_claims(candidate))
        repo.set_open_to_work(candidate, OpenToWorkInput.model_validate(
            {"openToWork": True, "location": "Hà Nội", "experienceYears": 4}))
        conn.execute("reset role")  # the repos' savepoints leave the role set
        yield {"conn": conn, "employer": employer, "other_employer": other_employer, "candidate": candidate,
               "hidden": hidden, "posting": posting, "draft": draft, "other_posting": other_posting}


def _repo(who):
    return PostgresTalentRepository(_claims(who))


def _search(db, **query):
    items, _ = _repo(db["employer"]).search(db["employer"], TalentQuery(**query), 0, 100)
    return [t.candidate_id for t in items]


def test_view_has_no_contact_columns(db):
    columns = {r[0] for r in db["conn"].execute(
        "select column_name from information_schema.columns where table_name = 'talent_profiles'").fetchall()}
    assert not columns & {"email", "phone"}
    PostgresCvRepository(_claims(db["candidate"])).save(db["candidate"], CV)
    detail = _repo(db["employer"]).get(db["employer"], db["candidate"])
    dumped = detail.model_dump_json(by_alias=True)
    assert "talent-secret" not in dumped and "0909999888" not in dumped
    assert (detail.has_online_cv, detail.cv.full_name, detail.profile.location, detail.experience_years) == \
        (True, "Ứng Viên Tài Năng", "Hà Nội", 4)
    # The candidate's own profile shows the new fields.
    own = PostgresCandidateRepository(_claims(db["candidate"])).profile(str(db["candidate"]))
    assert (own.open_to_work, own.location, own.experience_years) == (True, "Hà Nội", 4)


def test_only_open_to_work_unlocked_candidates_for_employers(db):
    conn = db["conn"]
    assert db["candidate"] in _search(db) and db["hidden"] not in _search(db)
    assert db["candidate"] in _search(db, q="ke toan") and db["hidden"] not in _search(db, q="an minh")
    assert db["candidate"] in _search(db, skill="excel", location="ha noi", min_experience=4)
    assert db["candidate"] not in _search(db, min_experience=5)
    for who in (db["candidate"], db["hidden"]):  # non-Employers see nothing
        with _as(conn, who):
            assert conn.execute("select count(*) from public.talent_profiles").fetchone()[0] == 0
    _refused(conn, None, "select count(*) from public.talent_profiles", exc=errors.InsufficientPrivilege)

    conn.execute("reset role")
    conn.execute("update public.profiles set locked_at = now(), locked_reason = 'Vi phạm quy định' where id = %s",
                 (db["candidate"],))
    assert db["candidate"] not in _search(db)
    conn.execute("reset role")
    conn.execute("update public.profiles set locked_at = null, locked_reason = null where id = %s", (db["candidate"],))
    _repo(db["candidate"]).set_open_to_work(db["candidate"], OpenToWorkInput(open_to_work=False))
    assert db["candidate"] not in _search(db)
    assert _repo(db["employer"]).get(db["employer"], db["candidate"]) is None


def test_open_to_work_is_own_and_candidate_only(db):
    conn = db["conn"]
    _refused(conn, db["employer"], "update public.profiles set open_to_work = true where id = auth.uid()",
             exc=errors.CheckViolation)
    with _as(conn, db["hidden"]):  # someone else's row: RLS updates nothing
        assert conn.execute("update public.profiles set open_to_work = false where id = %s returning 1",
                            (db["candidate"],)).fetchone() is None
    for column, value in [("experience_years", 51), ("location", " ")]:
        _refused(conn, db["candidate"], f"update public.profiles set {column} = %s where id = auth.uid()", (value,),
                 exc=errors.CheckViolation)


def test_saved_candidates(db):
    conn = db["conn"]
    repo = _repo(db["employer"])
    assert repo.toggle_saved(db["employer"], db["candidate"], "Ghi chú") is True
    assert [t.candidate_id for t in repo.saved(db["employer"])] == [db["candidate"]]
    assert repo.get(db["employer"], db["candidate"]).saved is True
    assert _repo(db["other_employer"]).saved(db["other_employer"]) == []
    with pytest.raises(TalentError):
        repo.toggle_saved(db["employer"], db["hidden"], None)
    # Direct inserts: not for someone invisible, not as another Employer, not by a Candidate.
    for who, employer, cand in [(db["employer"], db["employer"], db["hidden"]),
                                (db["employer"], db["other_employer"], db["candidate"]),
                                (db["hidden"], db["hidden"], db["candidate"])]:
        _refused(conn, who, "insert into public.saved_candidates (employer_id, candidate_id) values (%s, %s)",
                 (employer, cand), exc=errors.InsufficientPrivilege)
    assert repo.toggle_saved(db["employer"], db["candidate"], None) is False
    assert repo.saved(db["employer"]) == []


def test_invite_talent(db):
    conn = db["conn"]
    repo = _repo(db["employer"])
    repo.invite(db["employer"], db["candidate"], db["posting"], "Mời bạn ứng tuyển")
    conn.execute("reset role")
    (type_, link, body) = conn.execute(
        "select type, link, body from public.notifications where recipient_id = %s", (db["candidate"],)).fetchone()
    assert (type_, link) == ("TALENT_INVITED", f"/jobs/{db['posting']}") and "Mời bạn ứng tuyển" in body
    with _as(conn, db["candidate"]):  # the Candidate sees their invitation
        assert conn.execute("select count(*) from public.talent_invitations").fetchone()[0] == 1

    def code(who, cand, posting, message=None):
        with pytest.raises(TalentError) as err:
            _repo(who).invite(who, cand, posting, message)
        return err.value.code

    assert code(db["employer"], db["candidate"], db["posting"]) == "ALREADY_INVITED"
    assert code(db["employer"], db["candidate"], db["draft"]) == "POSTING_NOT_OPEN"
    assert code(db["employer"], db["candidate"], db["other_posting"]) == "POSTING_NOT_OPEN"
    assert code(db["employer"], db["hidden"], db["posting"]) == "TALENT_NOT_FOUND"
    assert code(db["candidate"], db["candidate"], db["posting"]) == "TALENT_NOT_FOUND"  # not an Employer
    _refused(conn, db["employer"], "insert into public.talent_invitations (employer_id, candidate_id, posting_id) "
             "values (auth.uid(), %s, %s)", (db["candidate"], db["draft"]), exc=errors.InsufficientPrivilege)


def test_invite_limit_is_20_per_24_hours(db):
    conn = db["conn"]
    conn.execute("reset role")
    for i in range(19):
        (p,) = conn.execute(POSTING, (db["employer"], "PUBLISHED")).fetchone()
        conn.execute("insert into public.talent_invitations (employer_id, candidate_id, posting_id, created_at) "
                     "values (%s, %s, %s, now() - %s * interval '1 hour')",
                     (db["employer"], db["candidate"], p, 23 if i == 0 else 1))
    (old,) = conn.execute(POSTING, (db["employer"], "PUBLISHED")).fetchone()
    conn.execute("insert into public.talent_invitations (employer_id, candidate_id, posting_id, created_at) "
                 "values (%s, %s, %s, now() - interval '25 hours')", (db["employer"], db["candidate"], old))
    _repo(db["employer"]).invite(db["employer"], db["candidate"], db["posting"], None)  # 20th in 24 h
    conn.execute("reset role")
    (another,) = conn.execute(POSTING, (db["employer"], "PUBLISHED")).fetchone()
    with pytest.raises(TalentError) as err:
        _repo(db["employer"]).invite(db["employer"], db["candidate"], another, None)
    assert err.value.code == "INVITE_LIMIT"
