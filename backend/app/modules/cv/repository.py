from typing import Protocol
from uuid import UUID

from app.modules.cv.schemas import CvInput, OnlineCv


class CvRepository(Protocol):
    """The caller's own CV (RLS: owner only, Candidates only)."""

    def get(self, candidate_id: UUID) -> OnlineCv | None: ...
    def save(self, candidate_id: UUID, cv: CvInput) -> OnlineCv:
        """Creates or replaces."""
        ...
    def delete(self, candidate_id: UUID) -> None: ...
    def application_cv(self, employer_id: UUID, application_id: UUID) -> OnlineCv | None:
        """The snapshot taken at submit; None for a FILE Application.
        APPLICATION_NOT_FOUND unless the Application is on a posting `employer_id` owns."""
        ...
