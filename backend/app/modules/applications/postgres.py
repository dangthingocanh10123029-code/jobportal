from collections.abc import Callable
from typing import Any, TypeVar
from uuid import UUID

from psycopg import errors
from psycopg.rows import dict_row

from app.auth import Actor
from app.db import user_tx
from app.modules.applications.domain import ApplicationError, ApplicationStatus
from app.modules.applications.schemas import (
    Application,
    CandidateApplicationSummary,
    EmployerApplicationSummary,
    StatusChange,
)

_COLUMNS = "id, job_posting_id, candidate_id, status, created_at, updated_at"

T = TypeVar("T")


class PostgresApplicationRepository:
    """Runs as the caller (user_tx): RLS limits reads; writes go only through RPCs that take the actor from auth.uid()."""

    def __init__(self, claims: dict[str, Any] | None):
        self._claims = claims

    def _rows(self, query: str, params: Any, model: Callable[[dict], T]) -> list[T]:
        with user_tx(self._claims) as conn, conn.cursor(row_factory=dict_row) as cur:
            return [model(r) for r in cur.execute(query, params).fetchall()]

    def _rpc(self, query: str, params: Any) -> Application:
        try:
            rows = self._rows(f"select {_COLUMNS} from {query}", params, Application.model_validate)
        except errors.RaiseException as exc:
            # RPC errors whose message is an ApplicationError code are business refusals, not system failures.
            message = exc.diag.message_primary or ""
            if ApplicationError.is_code(message):
                raise ApplicationError(message) from exc
            raise
        return rows[0]

    def submit(self, candidate_id: UUID, posting_id: UUID, resume_path: str) -> Application:
        """`candidate_id` is not sent: submit_application takes the Candidate from auth.uid()."""
        return self._rpc("public.submit_application(%s, %s)", (posting_id, resume_path))

    def find_by_posting(self, candidate_id: UUID, posting_id: UUID) -> Application | None:
        rows = self._rows(
            f"select {_COLUMNS} from public.applications where candidate_id = %s and job_posting_id = %s",
            (candidate_id, posting_id),
            Application.model_validate,
        )
        return rows[0] if rows else None

    def list_status_changes(self, application_id: UUID) -> list[StatusChange]:
        return self._rows(
            "select from_status, to_status, changed_by_role, changed_at from public.application_status_changes "
            "where application_id = %s order by changed_at, id",
            (application_id,),
            StatusChange.model_validate,
        )

    def list_by_candidate(self, candidate_id: UUID) -> list[CandidateApplicationSummary]:
        # RLS also lets an Employer read Applications on their postings; the filter keeps this to one Candidate.
        return self._rows(
            f"select {_COLUMNS}, posting_title, company_name from public.candidate_application_summaries "
            "where candidate_id = %s order by created_at desc",
            (candidate_id,),
            CandidateApplicationSummary.model_validate,
        )

    def list_by_posting(self, employer_id: UUID, posting_id: UUID) -> list[EmployerApplicationSummary] | None:
        with user_tx(self._claims) as conn, conn.cursor(row_factory=dict_row) as cur:
            # Published postings are readable by everyone, so ownership needs the explicit employer_id filter.
            owned = cur.execute(
                "select 1 from public.job_postings where id = %s and employer_id = %s", (posting_id, employer_id)
            ).fetchone()
            if owned is None:
                return None
            rows = cur.execute(
                f"select {_COLUMNS}, candidate_name, candidate_phone, candidate_headline, candidate_skills "
                "from public.employer_application_summaries where job_posting_id = %s order by created_at desc",
                (posting_id,),
            ).fetchall()
        return [EmployerApplicationSummary.model_validate(r) for r in rows]

    def find_resume_path(self, employer_id: UUID, application_id: UUID) -> str | None:
        rows = self._rows(
            "select resume_path from public.employer_application_summaries where id = %s and employer_id = %s",
            (application_id, employer_id),
            lambda r: r["resume_path"],
        )
        return rows[0] if rows else None

    def change_status(self, application_id: UUID, to_status: ApplicationStatus, actor: Actor) -> Application:
        """`actor` is not sent: change_application_status takes the actor and role from auth.uid()."""
        return self._rpc("public.change_application_status(%s, %s)", (application_id, to_status))
