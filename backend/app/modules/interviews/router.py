from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends

from app.auth import CandidateActor, CurrentUser, EmployerActor, OptionalUser
from app.modules.interviews.domain import InterviewError, InterviewScope
from app.modules.interviews.postgres import PostgresInterviewRepository
from app.modules.interviews.repository import InterviewRepository
from app.modules.interviews.schemas import (
    CancelInput,
    Interview,
    InterviewInput,
    RespondInput,
)
from app.modules.interviews.service import InterviewService

router = APIRouter(tags=["interviews"])


def get_interview_repo(actor: OptionalUser) -> InterviewRepository:
    return PostgresInterviewRepository(actor.claims if actor else None)


def get_interview_service(repo: Annotated[InterviewRepository, Depends(get_interview_repo)]) -> InterviewService:
    return InterviewService(repo)


Service = Annotated[InterviewService, Depends(get_interview_service)]


@router.post("/applications/{application_id}/interviews", response_model=Interview, status_code=201)
def schedule_interview(
    application_id: UUID, data: InterviewInput, actor: EmployerActor, service: Service
) -> Interview:
    return service.schedule(actor, application_id, data)


@router.post("/interviews/{interview_id}/respond", response_model=Interview)
def respond_interview(interview_id: UUID, data: RespondInput, actor: CandidateActor, service: Service) -> Interview:
    return service.respond(actor, interview_id, data)


@router.post("/interviews/{interview_id}/cancel", response_model=Interview)
def cancel_interview(interview_id: UUID, data: CancelInput, actor: EmployerActor, service: Service) -> Interview:
    return service.cancel(actor, interview_id, data)


@router.post("/interviews/{interview_id}/done", response_model=Interview)
def mark_interview_done(interview_id: UUID, actor: EmployerActor, service: Service) -> Interview:
    return service.mark_done(actor, interview_id)


@router.get("/me/interviews", response_model=list[Interview])
def list_my_interviews(actor: CurrentUser, service: Service, scope: InterviewScope = "upcoming") -> list[Interview]:
    return service.list_mine(actor, scope)


@router.get("/applications/{application_id}/interviews", response_model=list[Interview])
def list_interviews_for_application(application_id: UUID, actor: CurrentUser, service: Service) -> list[Interview]:
    interviews = service.list_for_application(actor, application_id)
    if interviews is None:
        raise InterviewError("APPLICATION_NOT_FOUND")
    return interviews
