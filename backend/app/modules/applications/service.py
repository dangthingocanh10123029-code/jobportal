import logging
from uuid import UUID, uuid4

from app.auth import Actor
from app.modules.applications.domain import (
    ApplicationError,
    ApplicationStatus,
    check_resume,
)
from app.modules.applications.repository import ApplicationRepository
from app.modules.applications.schemas import (
    Application,
    CandidateApplicationDetail,
    CandidateApplicationSummary,
    EmployerApplicationSummary,
    ResumeUrl,
)
from app.modules.applications.storage import ResumeStorage

log = logging.getLogger(__name__)

RESUME_URL_TTL_SECONDS = 60


class ApplicationService:
    """Applications and the Application Status state machine; the database (RPC + RLS) has the final say."""

    def __init__(self, repo: ApplicationRepository, storage: ResumeStorage):
        self._repo = repo
        self._storage = storage

    def submit(self, candidate_id: UUID, posting_id: UUID, content_type: str | None, content: bytes) -> Application:
        """Uploads the Resume, then submits atomically; a refused submit drops the orphan upload (best effort)."""
        check_resume(content_type, content)
        # The folder must be the Candidate's id: Storage policy and submit_application both check it.
        path = f"{candidate_id}/{uuid4()}.pdf"
        self._storage.upload(path, content)
        try:
            return self._repo.submit(candidate_id, posting_id, path)
        except Exception:
            try:
                self._storage.remove(path)
            except Exception:
                log.exception("could not remove orphan resume %s", path)
            raise

    def get_mine(self, candidate_id: UUID, posting_id: UUID) -> Application | None:
        return self._repo.find_by_posting(candidate_id, posting_id)

    def list_mine(self, candidate_id: UUID) -> list[CandidateApplicationSummary]:
        return self._repo.list_by_candidate(candidate_id)

    def get_mine_with_history(self, candidate_id: UUID, application_id: UUID) -> CandidateApplicationDetail | None:
        # ponytail: scans the Candidate's list (tens of rows); add a find_summary query if that grows.
        summary = next((a for a in self._repo.list_by_candidate(candidate_id) if a.id == application_id), None)
        if summary is None:
            return None
        return CandidateApplicationDetail(**summary.model_dump(), history=self._repo.list_status_changes(application_id))

    def withdraw(self, candidate: Actor, application_id: UUID) -> Application:
        return self._repo.change_status(application_id, "WITHDRAWN", candidate)

    def list_for_posting(self, employer_id: UUID, posting_id: UUID) -> list[EmployerApplicationSummary] | None:
        return self._repo.list_by_posting(employer_id, posting_id)

    def change_status(self, employer: Actor, application_id: UUID, to_status: ApplicationStatus) -> Application:
        return self._repo.change_status(application_id, to_status, employer)

    def resume_url(self, employer_id: UUID, application_id: UUID) -> ResumeUrl:
        """Short-lived signed URL, only after checking the Application is on the Employer's posting."""
        path = self._repo.find_resume_path(employer_id, application_id)
        if path is None:
            raise ApplicationError("APPLICATION_NOT_FOUND")
        url = self._storage.signed_url(path, RESUME_URL_TTL_SECONDS)
        return ResumeUrl(url=url, expires_in_seconds=RESUME_URL_TTL_SECONDS)
