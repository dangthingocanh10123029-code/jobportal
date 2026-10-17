from dataclasses import dataclass, field

from app.modules.dashboard.domain import PostingStats


@dataclass
class InMemoryDashboardRepository:
    postings: dict[str, list[PostingStats]] = field(default_factory=dict)

    def posting_stats(self, employer_id: str):
        return list(self.postings.get(employer_id, []))
