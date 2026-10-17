from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, UploadFile

from app.auth import CandidateActor, EmployerActor, OptionalUser
from app.errors import DomainError
from app.modules.applications.domain import MAX_RESUME_BYTES, ApplicationError
from app.modules.applications.postgres import PostgresApplicationRepository
from app.modules.applications.repository import ApplicationRepository
from app.modules.applications.schemas import (
    Application,
    CandidateApplicationDetail,
    CandidateApplicationSummary,
    EmployerApplicationSummary,
    ResumeUrl,
    StatusChangeInput,
)
from app.modules.applications.service import ApplicationService
from app.modules.applications.storage import ResumeStorage, SupabaseResumeStorage

router = APIRouter(tags=["applications"])


def get_application_repo(actor: OptionalUser) -> ApplicationRepository:
    return PostgresApplicationRepository(actor.claims if actor else None)


def get_resume_storage(actor: OptionalUser) -> ResumeStorage:
    return SupabaseResumeStorage(actor.token if actor else "")


def get_application_service(
    repo: Annotated[ApplicationRepository, Depends(get_application_repo)],
    storage: Annotated[ResumeStorage, Depends(get_resume_storage)],
) -> ApplicationService:
    return ApplicationService(repo, storage)


Service = Annotated[ApplicationService, Depends(get_application_service)]


@router.post("/applications", response_model=Application, status_code=201)
def submit_application(
    actor: CandidateActor,
    service: Service,
    posting_id: Annotated[str, Form(alias="postingId")] = "",
    resume: Annotated[UploadFile | None, File()] = None,
) -> Application:
    """Multipart `postingId` + `resume` (PDF ≤ 5 MB)."""
    try:
        posting = UUID(posting_id)
    except ValueError:
        raise DomainError(422, "Mã tin không hợp lệ") from None
    content = resume.file.read(MAX_RESUME_BYTES + 1) if resume else b""
    return service.submit(UUID(actor.user_id), posting, resume.content_type if resume else None, content)


@router.get("/postings/{posting_id}/my-application", response_model=Application | None)
def get_my_application_for_posting(posting_id: UUID, actor: CandidateActor, service: Service) -> Application | None:
    return service.get_mine(UUID(actor.user_id), posting_id)


@router.get("/me/applications", response_model=list[CandidateApplicationSummary])
def list_my_applications(actor: CandidateActor, service: Service) -> list[CandidateApplicationSummary]:
    return service.list_mine(UUID(actor.user_id))


@router.get("/me/applications/{application_id}", response_model=CandidateApplicationDetail)
def get_my_application(application_id: UUID, actor: CandidateActor, service: Service) -> CandidateApplicationDetail:
    detail = service.get_mine_with_history(UUID(actor.user_id), application_id)
    if detail is None:
        raise ApplicationError("APPLICATION_NOT_FOUND")
    return detail


@router.post("/me/applications/{application_id}/withdraw", response_model=Application)
def withdraw_application(application_id: UUID, actor: CandidateActor, service: Service) -> Application:
    return service.withdraw(actor, application_id)


@router.get("/me/postings/{posting_id}/applications", response_model=list[EmployerApplicationSummary])
def list_applications_for_posting(
    posting_id: UUID, actor: EmployerActor, service: Service
) -> list[EmployerApplicationSummary]:
    applications = service.list_for_posting(UUID(actor.user_id), posting_id)
    if applications is None:
        raise DomainError(404, "Không tìm thấy tin tuyển dụng")
    return applications


@router.post("/applications/{application_id}/status", response_model=Application)
def change_application_status(
    application_id: UUID, data: StatusChangeInput, actor: EmployerActor, service: Service
) -> Application:
    return service.change_status(actor, application_id, data.to_status)


@router.get("/applications/{application_id}/resume-url", response_model=ResumeUrl)
def get_resume_url(application_id: UUID, actor: EmployerActor, service: Service) -> ResumeUrl:
    return service.resume_url(UUID(actor.user_id), application_id)
