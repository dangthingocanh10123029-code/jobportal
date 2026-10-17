from typing import Any
from uuid import UUID

from psycopg import Connection, sql
from psycopg.rows import dict_row

from app.db import user_tx
from app.modules.postings.domain import fold_accents
from app.modules.postings.schemas import PostingInput, SearchFilter, StoredPosting

# Explicit list: open_job_postings also carries the folded search columns, which are not needed back.
_COLUMNS = (
    "id, employer_id, company_name, title, description, location, employment_type, salary_min, salary_max, "
    "application_deadline, status, created_at, updated_at, industry, level, experience_years, headcount, skills, "
    "requirements, benefits, company_logo_url"
)

# Ties: newest first, then id, so pages stay stable. Mirrored by _SORT_KEYS in the InMemory adapter.
_ORDER = {
    "newest": "created_at desc, id",
    "salary_desc": "salary_max desc nulls last, created_at desc, id",
    "deadline_asc": "application_deadline, created_at desc, id",
}


def _escape_like(text: str) -> str:
    """The user's text is literal in ILIKE patterns (backslash is the default escape)."""
    return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _where(c: SearchFilter) -> tuple[str, list[Any]]:
    clauses: list[str] = []
    params: list[Any] = []

    def add(clause: str, value: Any) -> None:
        clauses.append(clause)
        params.append(value)

    if c.q is not None:
        add("search_text ilike %s", f"%{_escape_like(fold_accents(c.q))}%")
    if c.location is not None:
        add("search_location ilike %s", f"%{_escape_like(fold_accents(c.location))}%")
    if c.employment_type is not None:
        add("employment_type = %s", c.employment_type)
    if c.min_salary is not None:
        add("(salary_max is null or salary_max >= %s)", c.min_salary)
    if c.industry is not None:
        add("industry = %s", c.industry)
    if c.level is not None:
        add("level = %s", c.level)
    if c.max_experience is not None:
        add("experience_years <= %s", c.max_experience)
    if c.skill is not None:
        add("%s = any(search_skills)", fold_accents(c.skill))
    return (" where " + " and ".join(clauses) if clauses else ""), params


def _one(conn: Connection, query: Any, params: Any) -> StoredPosting | None:
    with conn.cursor(row_factory=dict_row) as cur:
        row = cur.execute(query, params).fetchone()
    return StoredPosting.model_validate(row) if row else None


class PostgresPostingRepository:
    """Runs as the caller (user_tx): RLS on job_postings enforces ownership and DRAFT privacy."""

    def __init__(self, claims: dict[str, Any] | None):
        self._claims = claims

    def insert(self, employer_id: UUID, data: PostingInput) -> StoredPosting:
        columns = {**data.model_dump(), "employer_id": employer_id}
        query = sql.SQL("insert into public.job_postings ({}) values ({}) returning id").format(
            sql.SQL(", ").join(map(sql.Identifier, columns)), sql.SQL(", ").join(sql.Placeholder() * len(columns))
        )
        with user_tx(self._claims) as conn:
            (posting_id,) = conn.execute(query, list(columns.values())).fetchone()  # type: ignore[misc]
            return self._must_find(conn, posting_id)

    def find_by_id(self, posting_id: UUID) -> StoredPosting | None:
        with user_tx(self._claims) as conn:
            return self._find(conn, posting_id)

    def update(self, posting_id: UUID, changes: dict[str, Any]) -> StoredPosting:
        query = sql.SQL("update public.job_postings set {} where id = %s").format(
            sql.SQL(", ").join(sql.SQL("{} = %s").format(sql.Identifier(k)) for k in changes)
        )
        with user_tx(self._claims) as conn:
            conn.execute(query, [*changes.values(), posting_id])
            return self._must_find(conn, posting_id)

    def list_by_employer(self, employer_id: UUID) -> list[StoredPosting]:
        with user_tx(self._claims) as conn, conn.cursor(row_factory=dict_row) as cur:
            rows = cur.execute(
                f"select {_COLUMNS} from public.job_postings_with_company where employer_id = %s "
                "order by created_at desc",
                (employer_id,),
            ).fetchall()
        return [StoredPosting.model_validate(r) for r in rows]

    def list_open(self, c: SearchFilter, offset: int, limit: int) -> tuple[list[StoredPosting], int]:
        where, params = _where(c)
        with user_tx(self._claims) as conn, conn.cursor(row_factory=dict_row) as cur:
            rows = cur.execute(
                f"select {_COLUMNS}, count(*) over () as total from public.open_job_postings{where} "
                f"order by {_ORDER[c.sort]} limit %s offset %s",
                [*params, limit, offset],
            ).fetchall()
            if rows or offset == 0:
                return [StoredPosting.model_validate(r) for r in rows], rows[0]["total"] if rows else 0
            # A page past the end has no row to carry the window count: count separately.
            total = cur.execute(f"select count(*) as n from public.open_job_postings{where}", params).fetchone()
            return [], total["n"] if total else 0

    def record_view(self, posting_id: UUID) -> None:
        with user_tx(self._claims) as conn:
            conn.execute("select public.record_posting_view(%s)", (posting_id,))

    def _find(self, conn: Connection, posting_id: UUID) -> StoredPosting | None:
        return _one(conn, f"select {_COLUMNS} from public.job_postings_with_company where id = %s", (posting_id,))

    def _must_find(self, conn: Connection, posting_id: UUID) -> StoredPosting:
        posting = self._find(conn, posting_id)
        if posting is None:
            raise RuntimeError(f"Không đọc lại được tin {posting_id}")
        return posting
