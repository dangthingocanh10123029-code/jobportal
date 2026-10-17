from collections.abc import Callable
from datetime import UTC, datetime
from typing import Any
from uuid import UUID, uuid4

from app.modules.postings.domain import fold_accents, is_open, meets_min_salary
from app.modules.postings.schemas import PostingInput, SearchFilter, StoredPosting

# Mirrors the ORDER BY of PostgresPostingRepository.list_open; None sorts the rows newest first only.
_SORT_KEYS: dict[str, Callable[[StoredPosting], Any] | None] = {
    "newest": None,
    "salary_desc": lambda r: -(r.salary_max if r.salary_max is not None else -1),
    "deadline_asc": lambda r: r.application_deadline,
}


class InMemoryPostingRepository:
    def __init__(
        self,
        company_names: dict[UUID, str] | None = None,
        now: Callable[[], datetime] = lambda: datetime.now(UTC),
        viewer_id: UUID | None = None,  # stands in for auth.uid() in record_view
    ):
        self.rows: dict[UUID, StoredPosting] = {}  # insertion order stands in for created_at
        self.views: dict[UUID, int] = {}
        self._company_names = company_names or {}
        self._now = now
        self.viewer_id = viewer_id

    def insert(self, employer_id: UUID, data: PostingInput) -> StoredPosting:
        at = datetime.now(UTC)
        row = StoredPosting(
            **data.model_dump(),
            id=uuid4(),
            employer_id=employer_id,
            company_name=self._company_names.get(employer_id, ""),
            company_logo_url=None,
            status="DRAFT",
            created_at=at,
            updated_at=at,
        )
        self.rows[row.id] = row
        return row.model_copy()

    def find_by_id(self, posting_id: UUID) -> StoredPosting | None:
        row = self.rows.get(posting_id)
        return row.model_copy() if row else None

    def update(self, posting_id: UUID, changes: dict[str, Any]) -> StoredPosting:
        row = self.rows[posting_id].model_copy(update={**changes, "updated_at": datetime.now(UTC)})
        self.rows[posting_id] = row
        return row.model_copy()

    def list_by_employer(self, employer_id: UUID) -> list[StoredPosting]:
        return [r.model_copy() for r in reversed(self.rows.values()) if r.employer_id == employer_id]

    def list_open(self, c: SearchFilter, offset: int, limit: int) -> tuple[list[StoredPosting], int]:
        def matches(r: StoredPosting) -> bool:
            return (
                is_open(r.status, r.application_deadline, self._now())
                and (c.q is None or fold_accents(c.q) in fold_accents(f"{r.title} {r.description}"))
                and (c.location is None or fold_accents(c.location) in fold_accents(r.location))
                and (c.employment_type is None or r.employment_type == c.employment_type)
                and (c.min_salary is None or meets_min_salary(r.salary_max, c.min_salary))
                and (c.industry is None or r.industry == c.industry)
                and (c.level is None or r.level == c.level)
                and (c.max_experience is None or r.experience_years <= c.max_experience)
                and (c.skill is None or any(fold_accents(s) == fold_accents(c.skill) for s in r.skills))
            )

        rows = [r for r in reversed(self.rows.values()) if matches(r)]
        if key := _SORT_KEYS[c.sort]:
            rows.sort(key=key)  # stable: ties stay newest first
        return [r.model_copy() for r in rows[offset : offset + limit]], len(rows)

    def record_view(self, posting_id: UUID) -> None:
        row = self.rows.get(posting_id)
        if row and row.status != "DRAFT" and row.employer_id != self.viewer_id:
            self.views[posting_id] = self.views.get(posting_id, 0) + 1
