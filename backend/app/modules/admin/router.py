from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, ConfigDict

from app.auth import AdminActor, Role
from app.modules.admin.domain import AuditAction
from app.modules.admin.postgres import PostgresAdminRepository
from app.modules.admin.service import AdminService
from app.modules.dashboard.domain import DisplayPostingStatus

router = APIRouter(prefix="/admin", tags=["admin"])

Page = Annotated[int, Query(ge=1, le=1000)]


class LockBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    locked: bool
    reason: str | None = None


class HiddenBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    hidden: bool
    reason: str | None = None


class VerifiedBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    verified: bool


def get_admin_service(actor: AdminActor) -> AdminService:
    return AdminService(PostgresAdminRepository(actor.claims))


Service = Annotated[AdminService, Depends(get_admin_service)]


@router.get("/stats")
def stats(service: Service):
    return service.stats()


@router.get("/users")
def list_users(service: Service, q: str | None = None, role: Role | None = None, locked: bool | None = None,
               page: Page = 1):
    return service.list_users({"q": q, "role": role, "locked": locked}, page)


@router.get("/users/{user_id}")
def get_user(user_id: UUID, service: Service):
    return service.get_user(str(user_id))


@router.post("/users/{user_id}/lock")
def lock_user(user_id: UUID, body: LockBody, service: Service):
    return service.set_user_lock(str(user_id), body.locked, body.reason)


@router.get("/postings")
def list_postings(service: Service, q: str | None = None, status: DisplayPostingStatus | None = None,
                  hidden: bool | None = None, employer_id: Annotated[UUID | None, Query(alias="employerId")] = None,
                  page: Page = 1):
    filters = {"q": q, "status": status, "hidden": hidden, "employerId": employer_id}
    return service.list_postings(filters, page)


@router.post("/postings/{posting_id}/hidden")
def hide_posting(posting_id: UUID, body: HiddenBody, service: Service):
    return service.set_posting_hidden(str(posting_id), body.hidden, body.reason)


@router.get("/companies")
def list_companies(service: Service, q: str | None = None, verified: bool | None = None, page: Page = 1):
    return service.list_companies({"q": q, "verified": verified}, page)


@router.post("/companies/{company_id}/verified")
def verify_company(company_id: UUID, body: VerifiedBody, service: Service):
    return service.set_company_verified(str(company_id), body.verified)


@router.get("/audit")
def list_audit(service: Service, action: AuditAction | None = None,
               actor_id: Annotated[UUID | None, Query(alias="actorId")] = None, page: Page = 1):
    return service.list_audit({"action": action, "actorId": actor_id}, page)


