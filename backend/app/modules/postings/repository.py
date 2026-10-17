from typing import Any, Protocol
from uuid import UUID

from app.modules.postings.schemas import PostingInput, SearchFilter, StoredPosting


class PostingRepository(Protocol):
    def insert(self, employer_id: UUID, data: PostingInput) -> StoredPosting: ...
    def find_by_id(self, posting_id: UUID) -> StoredPosting | None: ...
    def update(self, posting_id: UUID, changes: dict[str, Any]) -> StoredPosting:
        """`changes`: snake_case columns (PostingInput fields and/or `status`)."""
        ...
    def list_by_employer(self, employer_id: UUID) -> list[StoredPosting]:
        """Newest first."""
        ...
    def list_open(self, criteria: SearchFilter, offset: int, limit: int) -> tuple[list[StoredPosting], int]:
        """Open postings matching every criterion, ordered by criteria.sort (ties newest first), sliced; total counts all matches."""
        ...
    def record_view(self, posting_id: UUID) -> None:
        """Counts one view of a PUBLISHED/CLOSED posting by anyone but its Employer; a no-op otherwise."""
        ...
