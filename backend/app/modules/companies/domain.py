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
    verified: bool = False

    def json(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "logoUrl": self.logo_url,
            "about": self.about,
            "size": self.size,
            "address": self.address,
            "website": self.website,
            "companyVerified": self.verified,
        }


@dataclass(frozen=True)
class CompanySummary:
    company: Company
    open_postings: int
    rating: float | None = None
    review_count: int = 0

    def json(self) -> dict:
        return {**self.company.json(), "openPostings": self.open_postings, "rating": self.rating,
                "reviewCount": self.review_count}


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
