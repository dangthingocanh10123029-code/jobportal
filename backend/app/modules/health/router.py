from typing import Annotated

from fastapi import APIRouter, Depends, Response

from app.modules.health.postgres import PostgresHealthRepository
from app.modules.health.repository import HealthRepository
from app.modules.health.service import HealthService
from app.schemas import HealthOut

router = APIRouter(tags=["health"])


def get_health_repo() -> HealthRepository:
    return PostgresHealthRepository()


@router.get("/health", response_model=HealthOut)
def health(response: Response, repo: Annotated[HealthRepository, Depends(get_health_repo)]) -> HealthOut:
    status = HealthService(repo).check()
    if not status.ok:
        response.status_code = 503
    return HealthOut(status="ok" if status.ok else "degraded", db=status.db, jwks=status.jwks)
