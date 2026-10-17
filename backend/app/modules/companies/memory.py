import unicodedata
from dataclasses import dataclass, field

from app.modules.companies.domain import Company, CompanySummary


def fold(text: str) -> str:
    return "".join(
        c
        for c in unicodedata.normalize("NFD", text.lower())
        if unicodedata.category(c) != "Mn"
    ).replace("đ", "d")


@dataclass
class InMemoryCompanyRepository:
    companies: dict[str, Company] = field(default_factory=dict)
    postings: dict[str, list[dict]] = field(default_factory=dict)

    def get(self, company_id):
        return self.companies.get(company_id)

    def update(self, company_id, changes):
        company = self.get(company_id)
        if company is None:
            return None
        updated = Company(**{**company.__dict__, **changes})
        self.companies[company_id] = updated
        return updated

    def list(self, q, offset, limit):
        rows = [
            CompanySummary(c, len(self.postings.get(c.id, [])))
            for c in self.companies.values()
            if q is None or fold(q) in fold(c.name)
        ]
        rows.sort(key=lambda r: (-r.open_postings, fold(r.company.name), r.company.id))
        return rows[offset : offset + limit], len(rows)

    def open_postings(self, company_id):
        return list(self.postings.get(company_id, []))
