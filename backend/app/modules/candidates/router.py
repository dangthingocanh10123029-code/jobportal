import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict

from app.auth import CandidateActor, EmployerActor, OptionalUser
from app.errors import DomainError
from app.modules.candidates.postgres import PostgresCandidateRepository
from app.modules.candidates.repository import CandidateRepository
from app.modules.candidates.service import CandidateService

router = APIRouter(tags=["candidates"])


class CandidatePatch(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")
    headline: str | None = None
    skills: list[str] | None = None
    experience: str | None = None
    education: str | None = None


def get_candidate_repo(actor: OptionalUser) -> CandidateRepository:
    return PostgresCandidateRepository(actor.claims if actor else None)


def service(repo):
    return CandidateService(repo)


@router.get("/me/candidate-profile")
def get_profile(
    actor: CandidateActor,
    repo: Annotated[CandidateRepository, Depends(get_candidate_repo)],
):
    item = service(repo).get(actor.user_id)
    if item is None:
        raise DomainError(404, "Không tìm thấy hồ sơ ứng viên")
    return item.json()


@router.patch("/me/candidate-profile")
def patch_profile(
    body: CandidatePatch,
    actor: CandidateActor,
    repo: Annotated[CandidateRepository, Depends(get_candidate_repo)],
):
    return (
        service(repo).update(actor.user_id, body.model_dump(exclude_unset=True)).json()
    )


@router.get("/applications/{application_id}/applicant")
def get_applicant(
    application_id: uuid.UUID,
    actor: EmployerActor,
    repo: Annotated[CandidateRepository, Depends(get_candidate_repo)],
):
    item = service(repo).applicant(str(application_id))
    if item is None:
        raise DomainError(404, "Không tìm thấy hồ sơ ứng viên")
    return item.json()


@router.post("/me/saved-postings/{posting_id}/toggle")
def toggle_saved(
    posting_id: uuid.UUID,
    actor: CandidateActor,
    repo: Annotated[CandidateRepository, Depends(get_candidate_repo)],
):
    return service(repo).toggle(actor.user_id, str(posting_id))


@router.get("/me/saved-postings")
def saved(
    actor: CandidateActor,
    repo: Annotated[CandidateRepository, Depends(get_candidate_repo)],
):
    return service(repo).saved(actor.user_id)


@router.get("/me/saved-postings/ids")
def saved_ids(
    actor: CandidateActor,
    repo: Annotated[CandidateRepository, Depends(get_candidate_repo)],
):
    return service(repo).saved_ids(actor.user_id)
