from typing import Any
from uuid import UUID

from psycopg import errors
from psycopg.rows import dict_row

from app.db import user_tx
from app.modules.postings.domain import fold_accents
from app.modules.postings.postgres import _escape_like
from app.modules.talent.domain import TalentError
from app.modules.talent.schemas import (
    OpenToWorkInput,
    TalentCv,
    TalentDetail,
    TalentQuery,
    TalentSummary,
)

_SUMMARY = "candidate_id, full_name, headline, skills, location, experience_years, has_online_cv, updated_at, saved"


def _where(q: TalentQuery) -> tuple[str, list[Any]]:
    clauses: list[str] = []
    params: list[Any] = []
    for column, value in (("search_text", q.q), ("search_location", q.location)):
        if value and value.strip():
            clauses.append(f"{column} ilike %s")
            params.append(f"%{_escape_like(fold_accents(value.strip()))}%")
    if q.skill and q.skill.strip():
        clauses.append("%s = any(search_skills)")
        params.append(fold_accents(q.skill.strip()))
    if q.min_experience is not None:
        clauses.append("experience_years >= %s")
        params.append(q.min_experience)
    return (" where " + " and ".join(clauses) if clauses else ""), params


class PostgresTalentRepository:
    """Runs as the caller (user_tx). Employers read Candidates only through the talent_profiles view, which is
    empty for non-Employers and has no email/phone columns; invites go through the invite_talent RPC."""

    def __init__(self, claims: dict[str, Any] | None):
        self._claims = claims

    def set_open_to_work(self, candidate_id: UUID, data: OpenToWorkInput) -> bool:
        values = data.model_dump(exclude_unset=True)
        with user_tx(self._claims) as conn:
            row = conn.execute(
                f"update public.profiles set {', '.join(f'{k} = %s' for k in values)} "
                "where id = %s and role = 'CANDIDATE' returning open_to_work",
                (*values.values(), candidate_id),
            ).fetchone()
        if row is None:
            raise TalentError("TALENT_NOT_FOUND")
        return row[0]

    def search(self, employer_id: UUID, query: TalentQuery, offset: int, limit: int) -> tuple[list[TalentSummary], int]:
        where, params = _where(query)
        with user_tx(self._claims) as conn, conn.cursor(row_factory=dict_row) as cur:
            total = cur.execute(f"select count(*) as n from public.talent_profiles{where}", params).fetchone()["n"]
            rows = cur.execute(
                f"select {_SUMMARY} from public.talent_profiles{where} "
                "order by updated_at desc, candidate_id limit %s offset %s",
                (*params, limit, offset),
            ).fetchall()
        return [TalentSummary.model_validate(r) for r in rows], total

    def get(self, employer_id: UUID, candidate_id: UUID) -> TalentDetail | None:
        with user_tx(self._claims) as conn, conn.cursor(row_factory=dict_row) as cur:
            row = cur.execute(
                f"select {_SUMMARY}, experience, education, cv from public.talent_profiles where candidate_id = %s",
                (candidate_id,),
            ).fetchone()
        if row is None:
            return None
        return TalentDetail.model_validate({
            **row,
            "profile": {**row, "user_id": row["candidate_id"]},
            "cv": TalentCv.model_validate(row["cv"]) if row["cv"] else None,
        })

    def toggle_saved(self, employer_id: UUID, candidate_id: UUID, note: str | None) -> bool:
        with user_tx(self._claims) as conn:
            if conn.execute(
                "delete from public.saved_candidates where employer_id = %s and candidate_id = %s returning 1",
                (employer_id, candidate_id),
            ).fetchone():
                return False
            # The insert policy also requires a visible Candidate; checking here turns that into a 404, not a 500.
            row = conn.execute(
                "insert into public.saved_candidates (employer_id, candidate_id, note) "
                "select %s, %s, %s where exists (select 1 from public.talent_profiles where candidate_id = %s) "
                "on conflict do nothing returning 1",
                (employer_id, candidate_id, note, candidate_id),
            ).fetchone()
        if row is None:
            raise TalentError("TALENT_NOT_FOUND")
        return True

    def saved(self, employer_id: UUID) -> list[TalentSummary]:
        cols = ", ".join(f"t.{c.strip()}" for c in _SUMMARY.split(","))
        with user_tx(self._claims) as conn, conn.cursor(row_factory=dict_row) as cur:
            rows = cur.execute(
                f"select {cols} from public.saved_candidates s "
                "join public.talent_profiles t on t.candidate_id = s.candidate_id "
                "where s.employer_id = %s order by s.created_at desc",
                (employer_id,),
            ).fetchall()
        return [TalentSummary.model_validate(r) for r in rows]

    def invite(self, employer_id: UUID, candidate_id: UUID, posting_id: UUID, message: str | None) -> None:
        try:
            with user_tx(self._claims) as conn:
                conn.execute("select public.invite_talent(%s, %s, %s)", (candidate_id, posting_id, message))
        except errors.RaiseException as exc:
            # RPC errors whose message is a TalentError code are business refusals, not system failures.
            code = exc.diag.message_primary or ""
            if TalentError.is_code(code):
                raise TalentError(code) from exc
            raise
