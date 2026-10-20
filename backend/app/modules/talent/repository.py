from typing import Protocol
from uuid import UUID

from app.modules.talent.schemas import (
    OpenToWorkInput,
    TalentDetail,
    TalentQuery,
    TalentSummary,
)


class TalentRepository(Protocol):
    """Employers see only open-to-work, unlocked Candidates (talent_profiles), never email/phone."""

    def set_open_to_work(self, candidate_id: UUID, data: OpenToWorkInput) -> bool:
        """The caller's own profile; fields not sent stay. Returns the new openToWork."""
        ...
    def search(self, employer_id: UUID, query: TalentQuery, offset: int, limit: int) -> tuple[list[TalentSummary], int]: ...
    def get(self, employer_id: UUID, candidate_id: UUID) -> TalentDetail | None: ...
    def toggle_saved(self, employer_id: UUID, candidate_id: UUID, note: str | None) -> bool:
        """Saved → unsaved, otherwise saved. TALENT_NOT_FOUND when saving someone not visible."""
        ...
    def saved(self, employer_id: UUID) -> list[TalentSummary]:
        """Most recently saved first; Candidates no longer visible are left out."""
        ...
    def invite(self, employer_id: UUID, candidate_id: UUID, posting_id: UUID, message: str | None) -> None:
        """Raises TalentError: TALENT_NOT_FOUND, POSTING_NOT_OPEN, ALREADY_INVITED, INVITE_LIMIT."""
        ...
