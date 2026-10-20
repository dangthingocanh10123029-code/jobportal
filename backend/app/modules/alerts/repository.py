from typing import Protocol
from uuid import UUID

from app.modules.alerts.schemas import JobAlert, JobAlertInput, RecommendedPosting


class AlertRepository(Protocol):
    """A Candidate's own job alerts; JOB_ALERT notifications come from the job_postings_notify_alerts trigger."""

    def recommendations(self, candidate_id: UUID) -> list[RecommendedPosting]:
        """Best score first (skills ×3, applied industry ×2, location ×1), at most 10, never applied-to."""
        ...
    def list(self, candidate_id: UUID) -> list[JobAlert]:
        """Newest first."""
        ...
    def create(self, candidate_id: UUID, data: JobAlertInput) -> JobAlert:
        """Raises AlertError ALERT_LIMIT past 5."""
        ...
    def set_active(self, candidate_id: UUID, alert_id: UUID, active: bool) -> JobAlert | None: ...
    def delete(self, candidate_id: UUID, alert_id: UUID) -> bool: ...
