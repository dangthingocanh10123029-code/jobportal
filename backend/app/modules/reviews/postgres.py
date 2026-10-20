from typing import Any

from psycopg import errors
from psycopg.rows import dict_row
from pydantic.alias_generators import to_camel

from app.db import user_tx
from app.modules.reviews.domain import ReviewError
from app.modules.reviews.repository import Row

PUBLIC = "id, company_id, rating, title, pros, cons, author_name, anonymous, created_at"


def _camel(row: dict[str, Any]) -> Row:
    return {to_camel(k): v for k, v in row.items()}


class PostgresReviewRepository:
    """Runs as the caller (user_tx): company_reviews_public shows APPROVED reviews without the author's id,
    the table's RLS shows a Candidate only their own, admin_reviews is empty unless is_admin()."""

    def __init__(self, claims: dict[str, Any] | None):
        self.claims = claims

    def _query(self, query: str, params: Any = ()) -> list[Row]:
        with user_tx(self.claims) as conn, conn.cursor(row_factory=dict_row) as cur:
            return [_camel(r) for r in cur.execute(query, params).fetchall()]

    def _page(self, view: str, cols: str, where: str, params: list[Any], offset: int,
              limit: int) -> tuple[list[Row], int]:
        rows = self._query(f"select {cols}, count(*) over () as total from public.{view} where {where} "
                           "order by created_at desc, id desc offset %s limit %s", [*params, offset, limit])
        if rows:
            total = rows[0]["total"]
        else:  # page past the end: the window count has no row to ride on
            total = self._query(f"select count(*) as total from public.{view} where {where}", params)[0]["total"]
        for r in rows:
            del r["total"]
        return rows, total

    def _rpc(self, query: str, params: Any) -> None:
        try:
            self._query(query, params)
        except (errors.RaiseException, errors.InsufficientPrivilege) as exc:
            message = exc.diag.message_primary or ""
            if ReviewError.is_code(message):
                raise ReviewError(message) from exc
            if isinstance(exc, errors.InsufficientPrivilege):
                raise ReviewError("NOT_ADMIN") from exc
            raise

    def list_approved(self, company_id, offset, limit):
        return self._page("company_reviews_public", PUBLIC, "company_id = %s", [company_id], offset, limit)

    def rating_counts(self, company_id):
        rows = self._query("select rating, count(*) as n from public.company_reviews_public where company_id = %s "
                           "group by rating", (company_id,))
        return {r["rating"]: r["n"] for r in rows}

    def get_mine(self, company_id):
        rows = self._query(
            "select r.id, r.company_id, r.rating, r.title, r.pros, r.cons, r.anonymous, r.created_at, r.status, "
            "r.reject_reason, case when r.anonymous then 'Ứng viên ẩn danh' "
            "else coalesce(p.full_name, 'Ứng viên') end as author_name "
            "from public.company_reviews r left join public.profiles p on p.id = r.candidate_id "
            "where r.company_id = %s and r.candidate_id = auth.uid()", (company_id,))
        return rows[0] if rows else None

    def can_review(self, company_id):
        return self._query("select public.can_review_company(%s) as ok", (company_id,))[0]["ok"]

    def submit(self, company_id, rating, title, pros, cons, anonymous):
        self._rpc("select from public.submit_review(%s, %s, %s, %s, %s, %s)",
                  (company_id, rating, title, pros, cons, anonymous))

    def list_admin(self, status, offset, limit):
        where, params = ("status = %s", [status]) if status else ("true", [])
        return self._page("admin_reviews", f"{PUBLIC}, status, reject_reason, company_name, author_email",
                          where, params, offset, limit)

    def moderate(self, review_id, approve, reason):
        self._rpc("select from public.admin_moderate_review(%s, %s, %s)", (review_id, approve, reason))
