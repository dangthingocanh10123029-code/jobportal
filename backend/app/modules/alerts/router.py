from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends

from app.auth import CandidateActor, OptionalUser
from app.modules.alerts.postgres import PostgresAlertRepository
from app.modules.alerts.repository import AlertRepository
from app.modules.alerts.schemas import (
    JobAlert,
    JobAlertInput,
    JobAlertUpdate,
    RecommendedPosting,
)
from app.modules.alerts.service import AlertService

router = APIRouter(tags=["alerts"])


def get_alert_repo(actor: OptionalUser) -> AlertRepository:
    return PostgresAlertRepository(actor.claims if actor else None)


def get_alert_service(repo: Annotated[AlertRepository, Depends(get_alert_repo)]) -> AlertService:
    return AlertService(repo)


Service = Annotated[AlertService, Depends(get_alert_service)]


@router.get("/me/recommendations", response_model=list[RecommendedPosting])
def recommendations(actor: OptionalUser, service: Service) -> list[RecommendedPosting]:
    # Contract §44: guests and Employers get [], not 401/403.
    if actor is None or actor.role != "CANDIDATE":
        return []
    return service.recommendations(UUID(actor.user_id))


@router.get("/me/job-alerts", response_model=list[JobAlert])
def list_job_alerts(actor: CandidateActor, service: Service) -> list[JobAlert]:
    return service.list(UUID(actor.user_id))


@router.post("/me/job-alerts", response_model=JobAlert, status_code=201)
def create_job_alert(data: JobAlertInput, actor: CandidateActor, service: Service) -> JobAlert:
    return service.create(UUID(actor.user_id), data)


@router.patch("/me/job-alerts/{alert_id}", response_model=JobAlert)
def update_job_alert(alert_id: UUID, data: JobAlertUpdate, actor: CandidateActor, service: Service) -> JobAlert:
    return service.set_active(UUID(actor.user_id), alert_id, data.active)


@router.delete("/me/job-alerts/{alert_id}", response_model=None)
def delete_job_alert(alert_id: UUID, actor: CandidateActor, service: Service) -> None:
    service.delete(UUID(actor.user_id), alert_id)
