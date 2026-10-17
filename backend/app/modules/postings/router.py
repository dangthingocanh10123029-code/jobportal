import logging
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, Query

from app.auth import EmployerActor, OptionalUser
from app.modules.postings.domain import PostingError
from app.modules.postings.postgres import PostgresPostingRepository
from app.modules.postings.repository import PostingRepository
from app.modules.postings.schemas import (
    JobPosting,
    OpenPostingsPage,
    PostingDetail,
    PostingInput,
    PostingSummary,
    SearchQuery,
)
from app.modules.postings.service import PostingService

log = logging.getLogger(__name__)
router = APIRouter(tags=["postings"])


def get_posting_repo(actor: OptionalUser) -> PostingRepository:
    return PostgresPostingRepository(actor.claims if actor else None)


def get_posting_service(repo: Annotated[PostingRepository, Depends(get_posting_repo)]) -> PostingService:
    return PostingService(repo)


Service = Annotated[PostingService, Depends(get_posting_service)]


@router.get("/postings", response_model=OpenPostingsPage)
def list_open_postings(service: Service, query: Annotated[SearchQuery, Query()]) -> OpenPostingsPage:
    """Anyone. Malformed or blank filter fields are ignored; invalid page falls back to 1."""
    return service.list_open(query.to_filter())


@router.get("/postings/{posting_id}", response_model=PostingDetail)
def get_posting_detail(posting_id: UUID, service: Service, background: BackgroundTasks) -> PostingDetail:
    """Anyone. DRAFT and unknown ids → 404. Counts a view (after the response) unless the caller owns the posting."""
    detail = service.get_public(posting_id)
    if detail is None:
        raise PostingError("NOT_FOUND")
    background.add_task(_record_view, service, posting_id)
    return detail


def _record_view(service: PostingService, posting_id: UUID) -> None:
    try:
        service.record_view(posting_id)
    except Exception:  # a lost view count must not break the page
        log.exception("record_posting_view failed for %s", posting_id)


@router.get("/postings/{posting_id}/related", response_model=list[PostingSummary])
def get_related_postings(posting_id: UUID, service: Service) -> list[PostingSummary]:
    return service.list_related(posting_id)


@router.get("/me/postings", response_model=list[JobPosting])
def list_my_postings(actor: EmployerActor, service: Service) -> list[JobPosting]:
    return service.list_mine(UUID(actor.user_id))


@router.get("/me/postings/{posting_id}", response_model=JobPosting)
def get_my_posting(posting_id: UUID, actor: EmployerActor, service: Service) -> JobPosting:
    posting = service.get_mine(UUID(actor.user_id), posting_id)
    if posting is None:
        raise PostingError("NOT_FOUND")
    return posting


@router.post("/me/postings", response_model=JobPosting, status_code=201)
def create_posting_draft(data: PostingInput, actor: EmployerActor, service: Service) -> JobPosting:
    return service.create_draft(UUID(actor.user_id), data)


@router.put("/me/postings/{posting_id}", response_model=JobPosting)
def update_posting(posting_id: UUID, data: PostingInput, actor: EmployerActor, service: Service) -> JobPosting:
    return service.update(UUID(actor.user_id), posting_id, data)


@router.post("/me/postings/{posting_id}/publish", response_model=JobPosting)
def publish_posting(posting_id: UUID, actor: EmployerActor, service: Service) -> JobPosting:
    return service.publish(UUID(actor.user_id), posting_id)


@router.post("/me/postings/{posting_id}/close", response_model=JobPosting)
def close_posting(posting_id: UUID, actor: EmployerActor, service: Service) -> JobPosting:
    return service.close(UUID(actor.user_id), posting_id)
