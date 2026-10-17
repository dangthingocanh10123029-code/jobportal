from typing import Protocol
from uuid import UUID

from app.auth import Actor
from app.modules.applications.domain import ApplicationStatus
from app.modules.applications.schemas import (
    Application,
    CandidateApplicationSummary,
    EmployerApplicationSummary,
    StatusChange,
)


class ApplicationRepository(Protocol):
    def submit(self, candidate_id: UUID, posting_id: UUID, resume_path: str) -> Application:
        """Atomically: POSTING_NOT_OPEN unless the posting is open, ALREADY_APPLIED on a second try (ADR-0002);
        otherwise writes the SUBMITTED Application and its first Status Change together."""
        ...
    def find_by_posting(self, candidate_id: UUID, posting_id: UUID) -> Application | None: ...
    def list_status_changes(self, application_id: UUID) -> list[StatusChange]:
        """Oldest first."""
        ...
    def list_by_candidate(self, candidate_id: UUID) -> list[CandidateApplicationSummary]:
        """Newest first."""
        ...
    def list_by_posting(self, employer_id: UUID, posting_id: UUID) -> list[EmployerApplicationSummary] | None:
        """Newest first; None unless `employer_id` owns the posting."""
        ...
    def find_resume_path(self, employer_id: UUID, application_id: UUID) -> str | None:
        """None unless the Application is on a posting `employer_id` owns."""
        ...
    def change_status(self, application_id: UUID, to_status: ApplicationStatus, actor: Actor) -> Application:
        """Atomically: APPLICATION_NOT_FOUND unless `actor` is its Candidate or its posting's Employer;
        INVALID_TRANSITION unless allowed_next_statuses(status, role) has `to_status`."""
        ...
