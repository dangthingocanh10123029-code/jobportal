from typing import Any

from psycopg import errors
from psycopg.rows import dict_row
from pydantic.alias_generators import to_camel

from app.db import user_tx
from app.modules.billing.domain import BillingError
from app.modules.billing.repository import Row

PACKAGE = "id, code, name, description, price_vnd, duration_days, active"
ORDER = "id, package_name, posting_id, posting_title, amount_vnd, status, created_at, paid_at, featured_until"


def _camel(row: dict[str, Any]) -> Row:
    return {to_camel(k): v for k, v in row.items()}


class PostgresBillingRepository:
    """Runs as the caller (user_tx): RLS shows active packages to everyone (all to Admins), an Employer's own
    orders (order_summaries); admin_orders is empty unless is_admin()."""

    def __init__(self, claims: dict[str, Any] | None):
        self.claims = claims

    def _query(self, query: str, params: Any = ()) -> list[Row]:
        try:
            with user_tx(self.claims) as conn, conn.cursor(row_factory=dict_row) as cur:
                return [_camel(r) for r in cur.execute(query, params).fetchall()]
        except (errors.RaiseException, errors.InsufficientPrivilege) as exc:
            message = exc.diag.message_primary or ""
            if BillingError.is_code(message):
                raise BillingError(message) from exc
            if isinstance(exc, errors.InsufficientPrivilege):
                raise BillingError("NOT_ADMIN") from exc
            raise

    def _id(self, query: str, params: Any) -> str:
        return str(self._query(query, params)[0]["id"])

    def list_packages(self, active_only):
        where = " where active" if active_only else ""
        return self._query(f"select {PACKAGE} from public.service_packages{where} order by price_vnd, code")

    def get_package(self, package_id):
        rows = self._query(f"select {PACKAGE} from public.service_packages where id = %s", (package_id,))
        return rows[0] if rows else None

    def save_package(self, package_id, code, name, description, price_vnd, duration_days, active):
        return self._id("select public.admin_save_package(%s, %s, %s, %s, %s, %s, %s) as id",
                        (package_id, code, name, description, price_vnd, duration_days, active))

    def create_order(self, package_id, posting_id):
        return self._id("select public.create_order(%s, %s) as id", (package_id, posting_id))

    def pay_order(self, order_id):
        self._query("select from public.pay_order(%s)", (order_id,))

    def cancel_order(self, order_id):
        self._query("select from public.cancel_order(%s)", (order_id,))

    def get_order(self, order_id):
        rows = self._query(f"select {ORDER} from public.order_summaries where id = %s and employer_id = auth.uid()",
                           (order_id,))
        return rows[0] if rows else None

    def list_my_orders(self):
        return self._query(f"select {ORDER} from public.order_summaries where employer_id = auth.uid() "
                           "order by created_at desc, id desc limit 200")

    def list_admin_orders(self, status, offset, limit):
        where, params = ("status = %s", [status]) if status else ("true", [])
        rows = self._query(f"select {ORDER}, employer_email, company_name, count(*) over () as total "
                           f"from public.admin_orders where {where} order by created_at desc, id desc "
                           "offset %s limit %s", [*params, offset, limit])
        if rows:
            total = rows[0]["total"]
        else:  # page past the end: the window count has no row to ride on
            total = self._query(f"select count(*) as total from public.admin_orders where {where}", params)[0]["total"]
        for r in rows:
            del r["total"]
        return rows, total
