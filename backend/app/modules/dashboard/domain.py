from dataclasses import dataclass
from typing import Literal

ApplicationStatus = Literal[
    "SUBMITTED", "REVIEWING", "INTERVIEWING", "OFFERED", "HIRED", "REJECTED", "WITHDRAWN"
]
DisplayPostingStatus = Literal["DRAFT", "PUBLISHED", "CLOSED", "EXPIRED"]
APPLICATION_STATUSES: tuple[ApplicationStatus, ...] = (
    "SUBMITTED", "REVIEWING", "INTERVIEWING", "OFFERED", "HIRED", "REJECTED", "WITHDRAWN"
)


@dataclass(frozen=True)
class PostingStats:
    id: str
    title: str
    status: str
    application_deadline: str
    views: int
    applications_by_status: dict[str, int]


@dataclass(frozen=True)
class EmployerDashboard:
    totals: dict
    by_status: dict[str, int]
    postings: list[dict]

    def json(self) -> dict:
        return {"totals": self.totals, "byStatus": self.by_status, "postings": self.postings}
