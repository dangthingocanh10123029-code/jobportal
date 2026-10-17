from typing import Annotated

from fastapi import APIRouter, Depends

from app.auth import EmployerActor, OptionalUser
from app.modules.dashboard.postgres import PostgresDashboardRepository
from app.modules.dashboard.repository import DashboardRepository
from app.modules.dashboard.service import DashboardService

router = APIRouter(tags=["dashboard"])


def get_dashboard_repo(actor: OptionalUser) -> DashboardRepository:
    return PostgresDashboardRepository(actor.claims if actor else None)


@router.get("/me/dashboard")
def get_dashboard(
    actor: EmployerActor,
    repo: Annotated[DashboardRepository, Depends(get_dashboard_repo)],
):
    return DashboardService(repo).for_employer(actor.user_id).json()
