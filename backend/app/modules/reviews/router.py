from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, ConfigDict

from app.auth import AdminActor, CandidateActor, OptionalUser
from app.modules.reviews.domain import ReviewStatus
from app.modules.reviews.postgres import PostgresReviewRepository
from app.modules.reviews.service import ReviewService

router = APIRouter(tags=["reviews"])

Page = Annotated[int, Query(ge=1, le=1000)]


class ReviewBody(BaseModel):
    """Lengths are checked after trimming in the service (one Vietnamese message)."""

    model_config = ConfigDict(extra="forbid")
    rating: int
    title: str
    pros: str
    cons: str
    anonymous: bool


class ModerateBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    approve: bool
    reason: str | None = None


def get_public_service(actor: OptionalUser) -> ReviewService:
    return ReviewService(PostgresReviewRepository(actor.claims if actor else None))


def get_candidate_service(actor: CandidateActor) -> ReviewService:
    return ReviewService(PostgresReviewRepository(actor.claims))


def get_admin_service(actor: AdminActor) -> ReviewService:
    return ReviewService(PostgresReviewRepository(actor.claims))


PublicService = Annotated[ReviewService, Depends(get_public_service)]
CandidateService = Annotated[ReviewService, Depends(get_candidate_service)]
AdminService = Annotated[ReviewService, Depends(get_admin_service)]


@router.get("/companies/{company_id}/reviews")
def list_company_reviews(company_id: UUID, service: PublicService, page: Page = 1):
    return service.list_company(str(company_id), page)


# Guests, Employers and Admins have no review: null / false rather than 401/403, so company pages stay simple.
@router.get("/companies/{company_id}/my-review")
def get_my_review(company_id: UUID, actor: OptionalUser, service: PublicService):
    return service.get_mine(str(company_id)) if actor and actor.role == "CANDIDATE" else None


@router.get("/companies/{company_id}/can-review")
def can_review(company_id: UUID, actor: OptionalUser, service: PublicService) -> bool:
    return bool(actor and actor.role == "CANDIDATE" and service.can_review(str(company_id)))


@router.post("/companies/{company_id}/my-review")
def submit_review(company_id: UUID, body: ReviewBody, service: CandidateService):
    return service.submit(str(company_id), body.rating, body.title, body.pros, body.cons, body.anonymous)


@router.get("/admin/reviews")
def list_admin_reviews(service: AdminService, status: ReviewStatus | None = None, page: Page = 1):
    return service.list_admin(status, page)


@router.post("/admin/reviews/{review_id}/moderate")
def moderate_review(review_id: UUID, body: ModerateBody, service: AdminService) -> None:
    service.moderate(str(review_id), body.approve, body.reason)
