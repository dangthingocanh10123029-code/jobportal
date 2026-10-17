from typing import Protocol

from app.modules.dashboard.domain import PostingStats


class DashboardRepository(Protocol):
    def posting_stats(self, employer_id: str) -> list[PostingStats]: ...
