from uuid import UUID

from app.modules.cv.repository import CvRepository
from app.modules.cv.schemas import CvInput, OnlineCv


class CvService:
    """A Candidate's online CV. Inputs arrive validated (schemas); RLS has the final say on whose row."""

    def __init__(self, repo: CvRepository):
        self._repo = repo

    def get_mine(self, candidate_id: UUID) -> OnlineCv | None:
        return self._repo.get(candidate_id)

    def save_mine(self, candidate_id: UUID, cv: CvInput) -> OnlineCv:
        return self._repo.save(candidate_id, cv)

    def delete_mine(self, candidate_id: UUID) -> None:
        self._repo.delete(candidate_id)

    def application_cv(self, employer_id: UUID, application_id: UUID) -> OnlineCv | None:
        return self._repo.application_cv(employer_id, application_id)
