from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.auth import CandidateActor, EmployerActor, OptionalUser
from app.modules.talent.postgres import PostgresTalentRepository
from app.modules.talent.repository import TalentRepository
from app.modules.talent.schemas import (
    InviteInput,
    OpenToWorkInput,
    SaveTalentInput,
    TalentDetail,
    TalentPage,
    TalentQuery,
    TalentSummary,
)
from app.modules.talent.service import TalentService

router = APIRouter(tags=["talent"])


def get_talent_repo(actor: OptionalUser) -> TalentRepository:
    return PostgresTalentRepository(actor.claims if actor else None)


def get_talent_service(repo: Annotated[TalentRepository, Depends(get_talent_repo)]) -> TalentService:
    return TalentService(repo)


Service = Annotated[TalentService, Depends(get_talent_service)]


@router.post("/me/open-to-work")
def set_open_to_work(data: OpenToWorkInput, actor: CandidateActor, service: Service) -> dict:
    return service.set_open_to_work(UUID(actor.user_id), data)


@router.get("/talent", response_model=TalentPage)
def search_talent(query: Annotated[TalentQuery, Query()], actor: EmployerActor, service: Service) -> TalentPage:
    return service.search(UUID(actor.user_id), query)


@router.get("/me/saved-talent", response_model=list[TalentSummary])
def saved_talent(actor: EmployerActor, service: Service) -> list[TalentSummary]:
    return service.saved(UUID(actor.user_id))


@router.get("/talent/{candidate_id}", response_model=TalentDetail)
def get_talent(candidate_id: UUID, actor: EmployerActor, service: Service) -> TalentDetail:
    return service.get(UUID(actor.user_id), candidate_id)


@router.post("/talent/{candidate_id}/save")
def toggle_saved_talent(candidate_id: UUID, actor: EmployerActor, service: Service,
                        data: SaveTalentInput | None = None) -> dict:
    return service.toggle_saved(UUID(actor.user_id), candidate_id, data.note if data else None)


@router.post("/talent/{candidate_id}/invite", response_model=None)
def invite_talent(candidate_id: UUID, data: InviteInput, actor: EmployerActor, service: Service) -> None:
    service.invite(UUID(actor.user_id), candidate_id, data)
