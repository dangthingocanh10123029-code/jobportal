from datetime import UTC, datetime
from uuid import UUID, uuid4

from app.auth import Actor
from app.modules.applications.domain import (
    ApplicationError,
    ApplicationStatus,
    allowed_next_statuses,
)
from app.modules.applications.schemas import (
    Application,
    CandidateApplicationSummary,
    EmployerApplicationSummary,
    StatusChange,
)


class InMemoryApplicationRepository:
    """Enforces what the RPCs enforce, for pytest. `postings`: id → (employer_id, title, is_open)."""

    def __init__(self, postings: dict[UUID, tuple[UUID, str, bool]] | None = None):
        self.postings = postings or {}
        self.rows: dict[UUID, tuple[Application, str]] = {}  # insertion order stands in for created_at
        self.changes: dict[UUID, list[StatusChange]] = {}

    def submit(self, candidate_id: UUID, posting_id: UUID, resume_path: str) -> Application:
        if not resume_path.startswith(f"{candidate_id}/"):
            raise ApplicationError("INVALID_RESUME")
        posting = self.postings.get(posting_id)
        if posting is None or not posting[2]:
            raise ApplicationError("POSTING_NOT_OPEN")
        if self.find_by_posting(candidate_id, posting_id):
            raise ApplicationError("ALREADY_APPLIED")
        at = datetime.now(UTC)
        app = Application(
            id=uuid4(), job_posting_id=posting_id, candidate_id=candidate_id, status="SUBMITTED",
            created_at=at, updated_at=at,
        )
        self.rows[app.id] = (app, resume_path)
        self.changes[app.id] = [
            StatusChange(from_status=None, to_status="SUBMITTED", changed_by_role="CANDIDATE", changed_at=at)
        ]
        return app.model_copy()

    def find_by_posting(self, candidate_id: UUID, posting_id: UUID) -> Application | None:
        return next(
            (a.model_copy() for a, _ in self.rows.values()
             if a.candidate_id == candidate_id and a.job_posting_id == posting_id),
            None,
        )

    def list_status_changes(self, application_id: UUID) -> list[StatusChange]:
        return list(self.changes.get(application_id, []))

    def list_by_candidate(self, candidate_id: UUID) -> list[CandidateApplicationSummary]:
        return [
            CandidateApplicationSummary(
                **a.model_dump(), posting_title=self.postings[a.job_posting_id][1], company_name="ACME"
            )
            for a, _ in reversed(self.rows.values())
            if a.candidate_id == candidate_id
        ]

    def list_by_posting(self, employer_id: UUID, posting_id: UUID) -> list[EmployerApplicationSummary] | None:
        posting = self.postings.get(posting_id)
        if posting is None or posting[0] != employer_id:
            return None
        return [
            EmployerApplicationSummary(
                **a.model_dump(), candidate_name="Ứng viên", candidate_phone=None, candidate_headline=None,
                candidate_skills=[],
            )
            for a, _ in reversed(self.rows.values())
            if a.job_posting_id == posting_id
        ]

    def find_resume_path(self, employer_id: UUID, application_id: UUID) -> str | None:
        row = self.rows.get(application_id)
        return row[1] if row and self.postings[row[0].job_posting_id][0] == employer_id else None

    def change_status(self, application_id: UUID, to_status: ApplicationStatus, actor: Actor) -> Application:
        row = self.rows.get(application_id)
        owner = None
        if row:
            owner = row[0].candidate_id if actor.role == "CANDIDATE" else self.postings[row[0].job_posting_id][0]
        if row is None or str(owner) != actor.user_id:
            raise ApplicationError("APPLICATION_NOT_FOUND")
        app, path = row
        if to_status not in allowed_next_statuses(app.status, actor.role):
            raise ApplicationError("INVALID_TRANSITION")
        at = datetime.now(UTC)
        app = app.model_copy(update={"status": to_status, "updated_at": at})
        self.rows[application_id] = (app, path)
        self.changes[application_id].append(
            StatusChange(from_status=row[0].status, to_status=to_status, changed_by_role=actor.role, changed_at=at)
        )
        return app.model_copy()
