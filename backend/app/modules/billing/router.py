from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

from app.auth import AdminActor, EmployerActor, OptionalUser
from app.modules.billing.domain import OrderStatus
from app.modules.billing.postgres import PostgresBillingRepository
from app.modules.billing.service import BillingService

router = APIRouter(tags=["billing"])

Page = Annotated[int, Query(ge=1, le=1000)]


class OrderBody(BaseModel):
    model_config = ConfigDict(extra="forbid", alias_generator=to_camel)
    package_id: UUID
    posting_id: UUID


class PackageBody(BaseModel):
    """Bounds are checked after trimming in the service (one Vietnamese message)."""

    model_config = ConfigDict(extra="forbid", alias_generator=to_camel)
    code: str
    name: str
    description: str
    price_vnd: int
    duration_days: int
    active: bool


def get_public_service(actor: OptionalUser) -> BillingService:
    return BillingService(PostgresBillingRepository(actor.claims if actor else None))


def get_employer_service(actor: EmployerActor) -> BillingService:
    return BillingService(PostgresBillingRepository(actor.claims))


def get_admin_service(actor: AdminActor) -> BillingService:
    return BillingService(PostgresBillingRepository(actor.claims))


PublicService = Annotated[BillingService, Depends(get_public_service)]
EmployerService = Annotated[BillingService, Depends(get_employer_service)]
AdminService = Annotated[BillingService, Depends(get_admin_service)]


@router.get("/packages")
def list_packages(service: PublicService):
    return service.list_packages()


@router.post("/me/orders")
def create_order(body: OrderBody, service: EmployerService):
    return service.create_order(str(body.package_id), str(body.posting_id))


# SIMULATED payment: no gateway, no money taken.
@router.post("/me/orders/{order_id}/pay")
def pay_order(order_id: UUID, service: EmployerService):
    return service.pay_order(str(order_id))


@router.post("/me/orders/{order_id}/cancel")
def cancel_order(order_id: UUID, service: EmployerService):
    return service.cancel_order(str(order_id))


@router.get("/me/orders")
def list_my_orders(service: EmployerService):
    return service.list_my_orders()


@router.get("/admin/packages")
def list_admin_packages(service: AdminService):
    return service.list_admin_packages()


def _save(service: BillingService, package_id: str | None, body: PackageBody):
    return service.save_package(package_id, body.code, body.name, body.description, body.price_vnd,
                                body.duration_days, body.active)


@router.post("/admin/packages")
def create_package(body: PackageBody, service: AdminService):
    return _save(service, None, body)


@router.put("/admin/packages/{package_id}")
def update_package(package_id: UUID, body: PackageBody, service: AdminService):
    return _save(service, str(package_id), body)


@router.get("/admin/orders")
def list_admin_orders(service: AdminService, status: OrderStatus | None = None, page: Page = 1):
    return service.list_admin_orders(status, page)
