from uuid import UUID

from app.modules.alerts.domain import AlertError
from app.modules.alerts.repository import AlertRepository
from app.modules.alerts.schemas import JobAlert, JobAlertInput, RecommendedPosting


class AlertService:
    """Job alerts and recommendations. Inputs arrive validated (schemas); RLS and the limit trigger re-check."""

    def __init__(self, repo: AlertRepository):
        self._repo = repo

    def recommendations(self, candidate_id: UUID) -> list[RecommendedPosting]:
        return self._repo.recommendations(candidate_id)

    def list(self, candidate_id: UUID) -> list[JobAlert]:
        return self._repo.list(candidate_id)

    def create(self, candidate_id: UUID, data: JobAlertInput) -> JobAlert:
        return self._repo.create(candidate_id, data)

    def set_active(self, candidate_id: UUID, alert_id: UUID, active: bool) -> JobAlert:
        alert = self._repo.set_active(candidate_id, alert_id, active)
        if alert is None:
            raise AlertError("ALERT_NOT_FOUND")
        return alert

    def delete(self, candidate_id: UUID, alert_id: UUID) -> None:
        if not self._repo.delete(candidate_id, alert_id):
            raise AlertError("ALERT_NOT_FOUND")
