from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from app.auth import Actor
from app.modules.interviews.domain import (
    CANCELLABLE,
    MAX_DAYS_AHEAD,
    PENDING,
    RESPONSE_STATUS,
    InterviewError,
    InterviewResponse,
    InterviewScope,
)
from app.modules.interviews.schemas import CancelInput, Interview, InterviewInput


class InMemoryInterviewRepository:
    """Enforces what the RPCs enforce, for pytest.
    `applications`: id → (candidate_id, employer_id, posting_id, application status)."""

    def __init__(self, applications: dict[UUID, tuple[UUID, UUID, UUID, str]] | None = None):
        self.applications = applications or {}
        self.rows: dict[UUID, Interview] = {}

    def _side(self, actor: Actor, application_id: UUID) -> bool:
        app = self.applications.get(application_id)
        return app is not None and actor.user_id == str(app[0] if actor.role == "CANDIDATE" else app[1])

    def _own(self, actor: Actor, interview_id: UUID, role: str) -> Interview:
        row = self.rows.get(interview_id)
        if row is None or actor.role != role or not self._side(actor, row.application_id):
            raise InterviewError("INTERVIEW_NOT_FOUND")
        return row

    def _save(self, row: Interview, **update) -> Interview:
        self.rows[row.id] = row.model_copy(update=update | {"updated_at": datetime.now(UTC)})
        return self.rows[row.id].model_copy()

    def move(self, interview_id: UUID, scheduled_at: datetime) -> None:
        """Test helper: what an UPDATE as postgres would do."""
        self.rows[interview_id] = self.rows[interview_id].model_copy(update={"scheduled_at": scheduled_at})

    def schedule(self, actor: Actor, application_id: UUID, data: InterviewInput) -> Interview:
        if actor.role != "EMPLOYER" or not self._side(actor, application_id):
            raise InterviewError("APPLICATION_NOT_FOUND")
        candidate, employer, posting, status = self.applications[application_id]
        if status not in ("REVIEWING", "INTERVIEWING"):
            raise InterviewError("APPLICATION_NOT_INTERVIEWABLE")
        now = datetime.now(UTC)
        if not now < data.scheduled_at <= now + timedelta(days=MAX_DAYS_AHEAD):
            raise InterviewError("INVALID_SCHEDULE_TIME")
        if any(r.application_id == application_id and r.status in PENDING for r in self.rows.values()):
            raise InterviewError("INTERVIEW_ALREADY_PENDING")
        self.applications[application_id] = (candidate, employer, posting, "INTERVIEWING")
        row = Interview(
            id=uuid4(), application_id=application_id, posting_id=posting, posting_title="Kế toán",
            company_name="ACME", candidate_name="Ứng viên", **data.model_dump(), status="PROPOSED",
            candidate_note=None, created_at=now, updated_at=now,
        )
        self.rows[row.id] = row
        return row.model_copy()

    def respond(self, actor: Actor, interview_id: UUID, response: InterviewResponse, note: str | None) -> Interview:
        row = self._own(actor, interview_id, "CANDIDATE")
        if row.status != "PROPOSED":
            raise InterviewError("INVALID_INTERVIEW_STATE")
        if response == "RESCHEDULE" and not note:
            raise InterviewError("RESCHEDULE_NOTE_REQUIRED")
        return self._save(row, status=RESPONSE_STATUS[response], candidate_note=note)

    def cancel(self, actor: Actor, interview_id: UUID, data: CancelInput) -> Interview:
        row = self._own(actor, interview_id, "EMPLOYER")
        if row.status not in CANCELLABLE:
            raise InterviewError("INVALID_INTERVIEW_STATE")
        return self._save(row, status="CANCELLED")

    def mark_done(self, actor: Actor, interview_id: UUID) -> Interview:
        row = self._own(actor, interview_id, "EMPLOYER")
        if row.status != "CONFIRMED":
            raise InterviewError("INVALID_INTERVIEW_STATE")
        if row.scheduled_at > datetime.now(UTC):
            raise InterviewError("INTERVIEW_NOT_DUE")
        return self._save(row, status="DONE")

    def list_mine(self, actor: Actor, scope: InterviewScope) -> list[Interview]:
        now = datetime.now(UTC)
        rows = [
            r for r in self.rows.values()
            if self._side(actor, r.application_id)
            and (r.scheduled_at + timedelta(minutes=r.duration_minutes) >= now) == (scope == "upcoming")
        ]
        return sorted(rows, key=lambda r: r.scheduled_at, reverse=scope == "past")

    def list_for_application(self, actor: Actor, application_id: UUID) -> list[Interview] | None:
        if not self._side(actor, application_id):
            return None
        rows = [r for r in self.rows.values() if r.application_id == application_id]
        return sorted(rows, key=lambda r: r.scheduled_at, reverse=True)
