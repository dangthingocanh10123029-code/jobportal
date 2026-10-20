from datetime import UTC, datetime, timedelta
from uuid import UUID

from app.modules.postings.domain import fold_accents
from app.modules.talent.domain import INVITE_LIMIT, TalentError
from app.modules.talent.schemas import (
    OpenToWorkInput,
    TalentDetail,
    TalentQuery,
    TalentSummary,
)


class InMemoryTalentRepository:
    """For pytest. `candidates`: id → TalentDetail fields plus open_to_work, locked, email, phone;
    `postings`: id → (employer_id, open). Mirrors talent_profiles and invite_talent."""

    def __init__(self, candidates: dict[UUID, dict], postings: dict[UUID, tuple[UUID, bool]]):
        self.candidates = candidates
        self.postings = postings
        self.saved_rows: dict[tuple[UUID, UUID], str | None] = {}  # insertion order = save order
        self.invitations: list[tuple[UUID, UUID, UUID, datetime]] = []  # employer, candidate, posting, at
        self.notifications: list[tuple[UUID, str, str]] = []  # recipient, type, link

    def _visible(self, candidate_id: UUID) -> dict | None:
        c = self.candidates.get(candidate_id)
        return c if c and c["open_to_work"] and not c["locked"] else None

    def _summary(self, c: dict, employer_id: UUID) -> TalentSummary:
        saved = (employer_id, c["candidate_id"]) in self.saved_rows
        return TalentSummary.model_validate({**c, "has_online_cv": c.get("cv") is not None, "saved": saved})

    def set_open_to_work(self, candidate_id: UUID, data: OpenToWorkInput) -> bool:
        self.candidates[candidate_id].update(data.model_dump(exclude_unset=True))
        return self.candidates[candidate_id]["open_to_work"]

    def search(self, employer_id: UUID, query: TalentQuery, offset: int, limit: int) -> tuple[list[TalentSummary], int]:
        def match(c: dict) -> bool:
            text = fold_accents(" ".join([c["full_name"], c["headline"] or "", *c["skills"], c["experience"] or ""]))
            return ((not query.q or fold_accents(query.q.strip()) in text)
                    and (not query.location or fold_accents(query.location.strip()) in fold_accents(c["location"] or ""))
                    and (not query.skill or fold_accents(query.skill.strip()) in map(fold_accents, c["skills"]))
                    and (query.min_experience is None or (c["experience_years"] or -1) >= query.min_experience))

        found = sorted((c for c in self.candidates.values() if self._visible(c["candidate_id"]) and match(c)),
                       key=lambda c: c["updated_at"], reverse=True)
        return [self._summary(c, employer_id) for c in found[offset:offset + limit]], len(found)

    def get(self, employer_id: UUID, candidate_id: UUID) -> TalentDetail | None:
        c = self._visible(candidate_id)
        if c is None:
            return None
        return TalentDetail.model_validate({
            **self._summary(c, employer_id).model_dump(), "profile": {**c, "user_id": candidate_id}, "cv": c.get("cv"),
        })

    def toggle_saved(self, employer_id: UUID, candidate_id: UUID, note: str | None) -> bool:
        if self.saved_rows.pop((employer_id, candidate_id), 0) != 0:
            return False
        if self._visible(candidate_id) is None:
            raise TalentError("TALENT_NOT_FOUND")
        self.saved_rows[(employer_id, candidate_id)] = note
        return True

    def saved(self, employer_id: UUID) -> list[TalentSummary]:
        ids = [cid for e, cid in reversed(self.saved_rows) if e == employer_id]
        return [self._summary(self.candidates[cid], employer_id) for cid in ids if self._visible(cid)]

    def invite(self, employer_id: UUID, candidate_id: UUID, posting_id: UUID, message: str | None) -> None:
        if self._visible(candidate_id) is None:
            raise TalentError("TALENT_NOT_FOUND")
        if self.postings.get(posting_id) != (employer_id, True):
            raise TalentError("POSTING_NOT_OPEN")
        now = datetime.now(UTC)
        if sum(1 for e, *_, at in self.invitations if e == employer_id and at > now - timedelta(hours=24)) >= INVITE_LIMIT:
            raise TalentError("INVITE_LIMIT")
        if any(c == candidate_id and p == posting_id for _, c, p, _ in self.invitations):
            raise TalentError("ALREADY_INVITED")
        self.invitations.append((employer_id, candidate_id, posting_id, now))
        self.notifications.append((candidate_id, "TALENT_INVITED", f"/jobs/{posting_id}"))
