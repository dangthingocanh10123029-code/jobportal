from datetime import UTC, datetime
from uuid import UUID

from app.modules.cv.domain import CvError
from app.modules.cv.schemas import CvInput, OnlineCv


class InMemoryCvRepository:
    """For pytest. `applications`: id → (employer_id, snapshot or None for a FILE Application)."""

    def __init__(self, applications: dict[UUID, tuple[UUID, OnlineCv | None]] | None = None):
        self.applications = applications or {}
        self.rows: dict[UUID, OnlineCv] = {}

    def get(self, candidate_id: UUID) -> OnlineCv | None:
        return self.rows.get(candidate_id)

    def save(self, candidate_id: UUID, cv: CvInput) -> OnlineCv:
        self.rows[candidate_id] = OnlineCv(**cv.model_dump(), candidate_id=candidate_id, updated_at=datetime.now(UTC))
        return self.rows[candidate_id]

    def delete(self, candidate_id: UUID) -> None:
        self.rows.pop(candidate_id, None)

    def application_cv(self, employer_id: UUID, application_id: UUID) -> OnlineCv | None:
        row = self.applications.get(application_id)
        if row is None or row[0] != employer_id:
            raise CvError("APPLICATION_NOT_FOUND")
        return row[1]
