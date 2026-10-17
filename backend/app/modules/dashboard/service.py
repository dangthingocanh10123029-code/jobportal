from datetime import UTC, datetime

from app.modules.dashboard.domain import (
    APPLICATION_STATUSES,
    EmployerDashboard,
)
from app.modules.dashboard.repository import DashboardRepository


class DashboardService:
    def __init__(self, repo: DashboardRepository, now=None):
        self.repo = repo
        self.now = now or (lambda: datetime.now(UTC))

    def for_employer(self, employer_id: str) -> EmployerDashboard:
        by_status = {status: 0 for status in APPLICATION_STATUSES}
        postings = []
        for posting in self.repo.posting_stats(employer_id):
            applications = 0
            for status in APPLICATION_STATUSES:
                count = posting.applications_by_status.get(status, 0)
                by_status[status] += count
                applications += count
            deadline = datetime.fromisoformat(posting.application_deadline)
            if deadline.tzinfo is None:
                deadline = deadline.replace(tzinfo=UTC)
            display_status = (
                "EXPIRED"
                if posting.status == "PUBLISHED" and deadline < self.now()
                else posting.status
            )
            postings.append(
                {
                    "id": posting.id,
                    "title": posting.title,
                    "displayStatus": display_status,
                    "views": posting.views,
                    "applications": applications,
                }
            )
        return EmployerDashboard(
            totals={
                "postings": len(postings),
                "open": sum(p["displayStatus"] == "PUBLISHED" for p in postings),
                "applications": sum(p["applications"] for p in postings),
                "views": sum(p["views"] for p in postings),
            },
            by_status=by_status,
            postings=postings,
        )
