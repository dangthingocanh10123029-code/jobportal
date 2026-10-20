from typing import Any
from uuid import UUID

from psycopg import errors
from psycopg.rows import dict_row

from app.auth import Actor
from app.db import user_tx
from app.modules.interviews.domain import (
    InterviewError,
    InterviewResponse,
    InterviewScope,
)
from app.modules.interviews.schemas import CancelInput, Interview, InterviewInput

_COLUMNS = (
    "id, application_id, posting_id, posting_title, company_name, candidate_name, scheduled_at, duration_minutes, "
    "mode, location, note, status, candidate_note, created_at, updated_at"
)
_ENDS_AT = "scheduled_at + make_interval(mins => duration_minutes)"


class PostgresInterviewRepository:
    """Runs as the caller (user_tx): interview_details shows only the caller's own interviews; writes are RPCs
    that take the actor from auth.uid(), so `actor` is not sent."""

    def __init__(self, claims: dict[str, Any] | None):
        self._claims = claims

    def _rows(self, query: str, params: Any) -> list[Interview]:
        with user_tx(self._claims) as conn, conn.cursor(row_factory=dict_row) as cur:
            return [Interview.model_validate(r) for r in cur.execute(query, params).fetchall()]

    def _rpc(self, call: str, params: Any) -> Interview:
        try:
            return self._rows(f"select {_COLUMNS} from {call}", params)[0]
        except errors.RaiseException as exc:
            # RPC errors whose message is an InterviewError code are business refusals, not system failures.
            message = exc.diag.message_primary or ""
            if InterviewError.is_code(message):
                raise InterviewError(message) from exc
            raise

    def schedule(self, actor: Actor, application_id: UUID, data: InterviewInput) -> Interview:
        return self._rpc(
            "public.schedule_interview(%s, %s, %s, %s, %s, %s)",
            (application_id, data.scheduled_at, data.duration_minutes, data.mode, data.location, data.note),
        )

    def respond(self, actor: Actor, interview_id: UUID, response: InterviewResponse, note: str | None) -> Interview:
        return self._rpc("public.respond_interview(%s, %s, %s)", (interview_id, response, note))

    def cancel(self, actor: Actor, interview_id: UUID, data: CancelInput) -> Interview:
        return self._rpc("public.cancel_interview(%s, %s)", (interview_id, data.reason))

    def mark_done(self, actor: Actor, interview_id: UUID) -> Interview:
        return self._rpc("public.mark_interview_done(%s)", (interview_id,))

    def list_mine(self, actor: Actor, scope: InterviewScope) -> list[Interview]:
        # ponytail: newest 100 per scope, no paging; add a page param if a busy Employer needs more.
        where, order = (f"{_ENDS_AT} >= now()", "asc") if scope == "upcoming" else (f"{_ENDS_AT} < now()", "desc")
        return self._rows(
            f"select {_COLUMNS} from public.interview_details where {where} order by scheduled_at {order} limit 100",
            None,
        )

    def list_for_application(self, actor: Actor, application_id: UUID) -> list[Interview] | None:
        with user_tx(self._claims) as conn, conn.cursor(row_factory=dict_row) as cur:
            # applications RLS: only its Candidate and the posting's Employer see the row.
            if cur.execute("select 1 from public.applications where id = %s", (application_id,)).fetchone() is None:
                return None
            rows = cur.execute(
                f"select {_COLUMNS} from public.interview_details where application_id = %s "
                "order by scheduled_at desc",
                (application_id,),
            ).fetchall()
        return [Interview.model_validate(r) for r in rows]
