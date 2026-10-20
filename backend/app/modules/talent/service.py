from uuid import UUID

from app.modules.talent.domain import PAGE_SIZE, TalentError
from app.modules.talent.repository import TalentRepository
from app.modules.talent.schemas import (
    InviteInput,
    OpenToWorkInput,
    TalentDetail,
    TalentPage,
    TalentQuery,
    TalentSummary,
)


class TalentService:
    """Talent search. Inputs arrive validated (schemas); the DB view/RPC enforce visibility and invite limits."""

    def __init__(self, repo: TalentRepository):
        self._repo = repo

    def set_open_to_work(self, candidate_id: UUID, data: OpenToWorkInput) -> dict:
        return {"openToWork": self._repo.set_open_to_work(candidate_id, data)}

    def search(self, employer_id: UUID, query: TalentQuery) -> TalentPage:
        items, total = self._repo.search(employer_id, query, (query.page - 1) * PAGE_SIZE, PAGE_SIZE)
        return TalentPage(items=items, total=total, page=query.page)

    def get(self, employer_id: UUID, candidate_id: UUID) -> TalentDetail:
        detail = self._repo.get(employer_id, candidate_id)
        if detail is None:
            raise TalentError("TALENT_NOT_FOUND")
        return detail

    def toggle_saved(self, employer_id: UUID, candidate_id: UUID, note: str | None) -> dict:
        return {"saved": self._repo.toggle_saved(employer_id, candidate_id, note)}

    def saved(self, employer_id: UUID) -> list[TalentSummary]:
        return self._repo.saved(employer_id)

    def invite(self, employer_id: UUID, candidate_id: UUID, data: InviteInput) -> None:
        self._repo.invite(employer_id, candidate_id, data.posting_id, data.message)
