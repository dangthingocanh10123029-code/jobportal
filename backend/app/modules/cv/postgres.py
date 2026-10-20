from typing import Any
from uuid import UUID

from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from app.db import user_tx
from app.modules.cv.domain import CvError
from app.modules.cv.schemas import CvInput, OnlineCv

_FIELDS = ("template", "full_name", "headline", "email", "phone", "location", "summary",
           "experiences", "educations", "certifications", "skills", "languages")
_JSON = {"experiences", "educations", "certifications"}


class PostgresCvRepository:
    """Runs as the caller (user_tx): candidate_cvs RLS limits every statement to the caller's own row."""

    def __init__(self, claims: dict[str, Any] | None):
        self._claims = claims

    def get(self, candidate_id: UUID) -> OnlineCv | None:
        with user_tx(self._claims) as conn, conn.cursor(row_factory=dict_row) as cur:
            row = cur.execute("select * from public.candidate_cvs where candidate_id = %s", (candidate_id,)).fetchone()
        return OnlineCv.model_validate(row) if row else None

    def save(self, candidate_id: UUID, cv: CvInput) -> OnlineCv:
        data = cv.model_dump()
        values = [Jsonb(data[f]) if f in _JSON else data[f] for f in _FIELDS]
        columns = ", ".join(_FIELDS)
        with user_tx(self._claims) as conn, conn.cursor(row_factory=dict_row) as cur:
            row = cur.execute(
                f"insert into public.candidate_cvs (candidate_id, {columns}) "
                f"values (%s, {', '.join(['%s'] * len(_FIELDS))}) "
                f"on conflict (candidate_id) do update set ({columns}) = row({', '.join(f'excluded.{f}' for f in _FIELDS)}) "
                "returning *",
                (candidate_id, *values),
            ).fetchone()
        return OnlineCv.model_validate(row)

    def delete(self, candidate_id: UUID) -> None:
        with user_tx(self._claims) as conn:
            conn.execute("delete from public.candidate_cvs where candidate_id = %s", (candidate_id,))

    def application_cv(self, employer_id: UUID, application_id: UUID) -> OnlineCv | None:
        with user_tx(self._claims) as conn, conn.cursor(row_factory=dict_row) as cur:
            row = cur.execute(
                "select online_cv from public.employer_application_summaries where id = %s and employer_id = %s",
                (application_id, employer_id),
            ).fetchone()
        if row is None:
            raise CvError("APPLICATION_NOT_FOUND")
        return OnlineCv.model_validate(row["online_cv"]) if row["online_cv"] else None
