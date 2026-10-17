from __future__ import annotations

from typing import Any, Protocol

from app.modules.companies.domain import Company, CompanySummary


class CompanyRepository(Protocol):
    def get(self, company_id: str) -> Company | None: ...
    def update(self, company_id: str, changes: dict[str, Any]) -> Company | None: ...
    def list(
        self, q: str | None, offset: int, limit: int
    ) -> tuple[list[CompanySummary], int]: ...
    def open_postings(self, company_id: str) -> list[dict]: ...
