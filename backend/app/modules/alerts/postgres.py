from typing import Any
from uuid import UUID

from psycopg import errors
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from app.db import user_tx
from app.modules.alerts.domain import AlertError
from app.modules.alerts.schemas import JobAlert, JobAlertInput, RecommendedPosting

_ALERT = "id, name, filter, active, created_at, last_matched_at"
_SUMMARY = ", ".join(f"o.{c}" for c in (
    "id", "employer_id", "title", "company_name", "company_logo_url", "company_verified", "location",
    "employment_type", "salary_min", "salary_max", "application_deadline", "created_at", "industry", "level",
    "experience_years", "skills",
))


class PostgresAlertRepository:
    """Runs as the caller (user_tx): RLS keeps alerts to their owner; recommended_postings() scores for auth.uid()."""

    def __init__(self, claims: dict[str, Any] | None):
        self._claims = claims

    def recommendations(self, candidate_id: UUID) -> list[RecommendedPosting]:
        with user_tx(self._claims) as conn, conn.cursor(row_factory=dict_row) as cur:
            rows = cur.execute(
                f"select {_SUMMARY}, r.match_reasons from public.recommended_postings() r "
                "join public.open_job_postings o on o.id = r.posting_id "
                "order by r.score desc, o.created_at desc, o.id"
            ).fetchall()
        return [RecommendedPosting.model_validate(r) for r in rows]

    def list(self, candidate_id: UUID) -> list[JobAlert]:
        with user_tx(self._claims) as conn, conn.cursor(row_factory=dict_row) as cur:
            rows = cur.execute(
                f"select {_ALERT} from public.job_alerts where candidate_id = %s order by created_at desc, id",
                (candidate_id,),
            ).fetchall()
        return [JobAlert.model_validate(r) for r in rows]

    def create(self, candidate_id: UUID, data: JobAlertInput) -> JobAlert:
        try:
            with user_tx(self._claims) as conn, conn.cursor(row_factory=dict_row) as cur:
                row = cur.execute(
                    f"insert into public.job_alerts (candidate_id, name, filter) values (%s, %s, %s) returning {_ALERT}",
                    (candidate_id, data.name, Jsonb(data.filter.stored())),
                ).fetchone()
        except errors.RaiseException as exc:
            if AlertError.is_code(exc.diag.message_primary or ""):
                raise AlertError(exc.diag.message_primary or "") from exc
            raise
        return JobAlert.model_validate(row)

    def set_active(self, candidate_id: UUID, alert_id: UUID, active: bool) -> JobAlert | None:
        with user_tx(self._claims) as conn, conn.cursor(row_factory=dict_row) as cur:
            row = cur.execute(
                f"update public.job_alerts set active = %s where id = %s and candidate_id = %s returning {_ALERT}",
                (active, alert_id, candidate_id),
            ).fetchone()
        return JobAlert.model_validate(row) if row else None

    def delete(self, candidate_id: UUID, alert_id: UUID) -> bool:
        with user_tx(self._claims) as conn:
            row = conn.execute(
                "delete from public.job_alerts where id = %s and candidate_id = %s returning 1", (alert_id, candidate_id)
            ).fetchone()
        return row is not None
