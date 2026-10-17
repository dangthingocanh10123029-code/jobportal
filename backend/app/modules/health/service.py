from app.modules.health.domain import HealthStatus
from app.modules.health.repository import HealthRepository


class HealthService:
    def __init__(self, repo: HealthRepository):
        self._repo = repo

    def check(self) -> HealthStatus:
        return HealthStatus(db=self._repo.ping_db(), jwks=self._repo.ping_jwks())
