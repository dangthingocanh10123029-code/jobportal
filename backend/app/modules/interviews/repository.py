from typing import Protocol
from uuid import UUID

from app.auth import Actor
from app.modules.interviews.domain import InterviewResponse, InterviewScope
from app.modules.interviews.schemas import CancelInput, Interview, InterviewInput


class InterviewRepository(Protocol):
    """Every write is one RPC that takes the actor from auth.uid(); someone else's row looks missing (404)."""

    def schedule(self, actor: Actor, application_id: UUID, data: InterviewInput) -> Interview:
        """Employer of the posting; APPLICATION_NOT_INTERVIEWABLE unless REVIEWING/INTERVIEWING (REVIEWING moves to
        INTERVIEWING in the same transaction); INVALID_SCHEDULE_TIME; INTERVIEW_ALREADY_PENDING."""
        ...
    def respond(self, actor: Actor, interview_id: UUID, response: InterviewResponse, note: str | None) -> Interview:
        """Candidate of the Application; only while PROPOSED."""
        ...
    def cancel(self, actor: Actor, interview_id: UUID, data: CancelInput) -> Interview:
        """Employer; PROPOSED, CONFIRMED or RESCHEDULE_REQUESTED."""
        ...
    def mark_done(self, actor: Actor, interview_id: UUID) -> Interview:
        """Employer; CONFIRMED (else INVALID_INTERVIEW_STATE) and its time has come (else INTERVIEW_NOT_DUE)."""
        ...
    def list_mine(self, actor: Actor, scope: InterviewScope) -> list[Interview]:
        """upcoming = not yet over, soonest first; past = over, latest first."""
        ...
    def list_for_application(self, actor: Actor, application_id: UUID) -> list[Interview] | None:
        """Latest first; None unless `actor` is the Application's Candidate or its posting's Employer."""
        ...
