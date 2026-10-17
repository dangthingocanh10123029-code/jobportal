from dataclasses import dataclass
from typing import Literal

CompanySize = Literal["S1_10", "S11_50", "S51_200", "S201_500", "S500_PLUS"]


@dataclass(frozen=True)
class Company:
    id: str
    name: str
    logo_url: str | None = None
    about: str | None = None
    size: str | None = None
    address: str | None = None
    website: str | None = None

    def json(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "logoUrl": self.logo_url,
            "about": self.about,
            "size": self.size,
            "address": self.address,
            "website": self.website,
        }


@dataclass(frozen=True)
class CompanySummary:
    company: Company
    open_postings: int

    def json(self) -> dict:
        return {**self.company.json(), "openPostings": self.open_postings}


@dataclass(frozen=True)
class CompanyPage:
    items: list[CompanySummary]
    total: int
    page: int

    def json(self) -> dict:
        return {
            "items": [r.json() for r in self.items],
            "total": self.total,
            "page": self.page,
            "pageSize": 20,
        }
