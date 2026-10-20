from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends

from app.auth import CandidateActor, EmployerActor, OptionalUser
from app.modules.cv.postgres import PostgresCvRepository
from app.modules.cv.repository import CvRepository
from app.modules.cv.schemas import CvInput, OnlineCv
from app.modules.cv.service import CvService

router = APIRouter(tags=["cv"])


def get_cv_repo(actor: OptionalUser) -> CvRepository:
    return PostgresCvRepository(actor.claims if actor else None)


def get_cv_service(repo: Annotated[CvRepository, Depends(get_cv_repo)]) -> CvService:
    return CvService(repo)


Service = Annotated[CvService, Depends(get_cv_service)]


@router.get("/me/cv", response_model=OnlineCv | None)
def get_my_cv(actor: CandidateActor, service: Service) -> OnlineCv | None:
    return service.get_mine(UUID(actor.user_id))


@router.put("/me/cv", response_model=OnlineCv)
def save_my_cv(data: CvInput, actor: CandidateActor, service: Service) -> OnlineCv:
    return service.save_mine(UUID(actor.user_id), data)


@router.delete("/me/cv", response_model=None)
def delete_my_cv(actor: CandidateActor, service: Service) -> None:
    service.delete_mine(UUID(actor.user_id))


@router.get("/applications/{application_id}/cv", response_model=OnlineCv | None)
def get_application_cv(application_id: UUID, actor: EmployerActor, service: Service) -> OnlineCv | None:
    return service.application_cv(UUID(actor.user_id), application_id)
