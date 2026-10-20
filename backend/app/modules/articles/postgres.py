from typing import Any

from psycopg import errors
from psycopg.rows import dict_row
from pydantic.alias_generators import to_camel

from app.db import user_tx
from app.modules.articles.domain import ArticleError
from app.modules.articles.repository import Row

SUMMARY = "id, slug, title, excerpt, category, cover_image, reading_minutes, published_at, views"


def _camel(row: dict[str, Any]) -> Row:
    return {to_camel(k): v for k, v in row.items()}


class PostgresArticleRepository:
    """Runs as the caller (user_tx): RLS shows anyone PUBLISHED rows, ADMIN every row; the RPCs refuse non-admins."""

    def __init__(self, claims: dict[str, Any] | None):
        self.claims = claims

    def _query(self, query: str, params: Any = ()) -> list[Row]:
        with user_tx(self.claims) as conn, conn.cursor(row_factory=dict_row) as cur:
            return [_camel(r) for r in cur.execute(query, params).fetchall()]

    def _page(self, cols: str, where: str, params: list[Any], order: str, offset: int,
              limit: int) -> tuple[list[Row], int]:
        rows = self._query(
            f"select {cols}, count(*) over () as total from public.articles where {where} "
            f"order by {order} offset %s limit %s", [*params, offset, limit])
        if rows:
            total = rows[0]["total"]
        else:  # page past the end: the window count has no row to ride on
            total = self._query(f"select count(*) as total from public.articles where {where}", params)[0]["total"]
        for r in rows:
            del r["total"]
        return rows, total

    def _rpc(self, query: str, params: Any) -> list[Row]:
        try:
            return self._query(query, params)
        except (errors.RaiseException, errors.InsufficientPrivilege) as exc:
            message = exc.diag.message_primary or ""
            if ArticleError.is_code(message):
                raise ArticleError(message) from exc
            if isinstance(exc, errors.InsufficientPrivilege):
                raise ArticleError("NOT_ADMIN") from exc
            raise
        except errors.UniqueViolation as exc:  # two saves raced for the same free slug
            raise ArticleError("SLUG_TAKEN") from exc

    def list_published(self, category, q, offset, limit):
        conditions, params = ["status = 'PUBLISHED'"], []
        if category:
            conditions.append("category = %s")
            params.append(category)
        if q:
            conditions.append("strpos(public.f_unaccent(title || ' ' || excerpt), public.f_unaccent(%s)) > 0")
            params.append(q)
        return self._page(SUMMARY, " and ".join(conditions), params, "published_at desc, id", offset, limit)

    def get_published(self, slug):
        rows = self._query(f"select {SUMMARY}, content from public.articles where slug = %s and status = 'PUBLISHED'",
                           (slug,))
        return rows[0] if rows else None

    def related(self, article_id, category, limit):
        return self._query(
            f"select {SUMMARY} from public.articles where status = 'PUBLISHED' and category = %s and id <> %s "
            "order by published_at desc, id limit %s", (category, article_id, limit))

    def increment_views(self, slug):
        self._query("select from public.increment_article_views(%s)", (slug,))

    def list_admin(self, status, offset, limit):
        where, params = ("status = %s", [status]) if status else ("true", [])
        return self._page(f"{SUMMARY}, status", where, params, "created_at desc, id", offset, limit)

    def get_admin(self, article_id):
        rows = self._query(f"select {SUMMARY}, content, status from public.articles where id = %s", (article_id,))
        return rows[0] if rows else None

    def save(self, article_id, title, slug, excerpt, category, content):
        rows = self._rpc("select public.admin_save_article(%s, %s, %s, %s, %s, %s) as id",
                         (article_id, title, slug, excerpt, category, content))
        return str(rows[0]["id"])

    def set_published(self, article_id, published):
        self._rpc("select from public.admin_set_article_published(%s, %s)", (article_id, published))
