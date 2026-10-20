from uuid import UUID

from app.auth import Actor
from app.modules.interviews.domain import InterviewScope
from app.modules.interviews.repository import InterviewRepository
from app.modules.interviews.schemas import (
    CancelInput,
    Interview,
    InterviewInput,
    RespondInput,
)


class InterviewService:
    """Interviews on an Application: Employer schedules, cancels, marks done; Candidate answers.
    Inputs arrive validated (schemas); the database (RPC + RLS) has the final say on who and when."""

    def __init__(self, repo: InterviewRepository):
        self._repo = repo

    def schedule(self, employer: Actor, application_id: UUID, data: InterviewInput) -> Interview:
        return self._repo.schedule(employer, application_id, data)

    def respond(self, candidate: Actor, interview_id: UUID, data: RespondInput) -> Interview:
        return self._repo.respond(candidate, interview_id, data.response, data.note)

    def cancel(self, employer: Actor, interview_id: UUID, data: CancelInput) -> Interview:
        return self._repo.cancel(employer, interview_id, data)

    def mark_done(self, employer: Actor, interview_id: UUID) -> Interview:
        return self._repo.mark_done(employer, interview_id)

    def list_mine(self, actor: Actor, scope: InterviewScope) -> list[Interview]:
        return self._repo.list_mine(actor, scope)

    def list_for_application(self, actor: Actor, application_id: UUID) -> list[Interview] | None:
        return self._repo.list_for_application(actor, application_id)
