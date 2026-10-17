from typing import Any

from psycopg import errors
from psycopg.rows import dict_row
from pydantic.alias_generators import to_camel

from app.db import user_tx
from app.modules.admin.domain import AdminError
from app.modules.admin.repository import Row

USER_COLS = "user_id, email, role, display_name, created_at, last_sign_in_at, locked_at, locked_reason"
POSTING_COLS = (
    "id, employer_id, title, company_name, company_logo_url, company_verified, location, employment_type, "
    "salary_min, salary_max, application_deadline, created_at, industry, level, experience_years, skills, status, "
    "display_status, applications, hidden_at, hidden_reason"
)
COMPANY_COLS = (
    "id, name, logo_url, about, size, address, website, company_verified, open_postings, verified_at, employer_email"
)
AUDIT_COLS = "id, actor_id, actor_email, action, target_type, target_id, target_label, details, created_at"

# filter key → SQL condition on the admin_* views (values are always bound parameters).
USER_FILTERS = {
    "q": "strpos(search_text, public.f_unaccent(%s)) > 0",
    "role": "role = %s",
    "locked": "(locked_at is not null) = %s",
}
POSTING_FILTERS = {
    "q": "strpos(search_text, public.f_unaccent(%s)) > 0",
    "status": "display_status = %s",
    "hidden": "(hidden_at is not null) = %s",
    "employerId": "employer_id = %s",
}
COMPANY_FILTERS = {
    "q": "strpos(search_name, public.f_unaccent(%s)) > 0",
    "verified": "(verified_at is not null) = %s",
}
AUDIT_FILTERS = {"action": "action = %s", "actorId": "actor_id = %s"}


def _camel(row: dict[str, Any]) -> Row:
    return {to_camel(k): v for k, v in row.items()}


class PostgresAdminRepository:
    """Runs as the caller (user_tx): the admin_* views return nothing and the RPCs refuse unless is_admin()."""

    def __init__(self, claims: dict[str, Any] | None):
        self.claims = claims

    def _query(self, query: str, params: Any = ()) -> list[Row]:
        with user_tx(self.claims) as conn, conn.cursor(row_factory=dict_row) as cur:
            return [_camel(r) for r in cur.execute(query, params).fetchall()]

    def _page(self, view: str, cols: str, conditions: dict[str, str], filters: Row, order: str,
              offset: int, limit: int) -> tuple[list[Row], int]:
        keys = [k for k in conditions if k in filters]
        where = " where " + " and ".join(conditions[k] for k in keys) if keys else ""
        rows = self._query(
            f"select {cols}, count(*) over () as total from public.{view}{where} order by {order} offset %s limit %s",
            [*(filters[k] for k in keys), offset, limit],
        )
        if rows or offset == 0:
            return [{k: v for k, v in r.items() if k != "total"} for r in rows], rows[0]["total"] if rows else 0
        # A page past the end has no row to carry the window count.
        return [], self._query(f"select count(*) as n from public.{view}{where}", [filters[k] for k in keys])[0]["n"]

    def _one(self, view: str, cols: str, key: str, value: str) -> Row | None:
        rows = self._query(f"select {cols} from public.{view} where {key} = %s", (value,))
        return rows[0] if rows else None

    def _rpc(self, query: str, params: Any) -> None:
        try:
            self._query(f"select from {query}", params)
        except (errors.RaiseException, errors.InsufficientPrivilege) as exc:
            message = exc.diag.message_primary or ""
            if AdminError.is_code(message):
                raise AdminError(message) from exc
            raise

    def stats(self) -> Row:
        try:
            return self._query("select public.admin_stats() as stats")[0]["stats"]
        except errors.InsufficientPrivilege as exc:
            raise AdminError("NOT_ADMIN") from exc

    def list_users(self, filters, offset, limit):
        return self._page("admin_users", USER_COLS, USER_FILTERS, filters, "created_at desc, user_id", offset, limit)

    def get_user(self, user_id):
        return self._one("admin_users", f"{USER_COLS}, phone, postings, applications", "user_id", user_id)

    def set_user_lock(self, user_id, locked, reason):
        self._rpc("public.admin_set_user_lock(%s, %s, %s)", (user_id, locked, reason))

    def list_postings(self, filters, offset, limit):
        return self._page("admin_postings", POSTING_COLS, POSTING_FILTERS, filters, "created_at desc, id", offset, limit)

    def get_posting(self, posting_id):
        return self._one("admin_postings", POSTING_COLS, "id", posting_id)

    def set_posting_hidden(self, posting_id, hidden, reason):
        self._rpc("public.admin_set_posting_hidden(%s, %s, %s)", (posting_id, hidden, reason))

    def list_companies(self, filters, offset, limit):
        return self._page("admin_companies", COMPANY_COLS, COMPANY_FILTERS, filters, "name, id", offset, limit)

    def get_company(self, company_id):
        return self._one("admin_companies", COMPANY_COLS, "id", company_id)

    def set_company_verified(self, company_id, verified):
        self._rpc("public.admin_set_company_verified(%s, %s)", (company_id, verified))

    def list_audit(self, filters, offset, limit):
        return self._page("admin_audit_entries", AUDIT_COLS, AUDIT_FILTERS, filters, "created_at desc, id", offset, limit)


