from datetime import UTC, datetime
from uuid import UUID, uuid4

from app.modules.alerts.domain import ALERT_LIMIT, RECOMMENDATION_LIMIT, AlertError
from app.modules.alerts.schemas import JobAlert, JobAlertInput, RecommendedPosting
from app.modules.postings.domain import fold_accents


class InMemoryAlertRepository:
    """For pytest. `postings`: id → PostingSummary fields plus `open`; `profiles`: Candidate id → skills, location;
    `applied`: Candidate id → posting ids. Mirrors job_alerts RLS/limit and recommended_postings()."""

    def __init__(self, postings: dict[UUID, dict], profiles: dict[UUID, dict], applied: dict[UUID, set[UUID]]):
        self.postings = postings
        self.profiles = profiles
        self.applied = applied
        self.alerts: dict[UUID, tuple[UUID, JobAlert]] = {}  # id → (owner, alert)

    def recommendations(self, candidate_id: UUID) -> list[RecommendedPosting]:
        me = self.profiles.get(candidate_id)
        if me is None:
            return []
        mine = {fold_accents(s) for s in me["skills"]}
        applied = [self.postings[p] for p in self.applied.get(candidate_id, set())]
        scored = []
        for p in self.postings.values():
            if not p["open"] or p["id"] in self.applied.get(candidate_id, set()):
                continue
            skills = [s for s in p["skills"] if fold_accents(s) in mine]
            industry = any(a["industry"] == p["industry"] for a in applied)
            where = fold_accents(p["location"])
            location = bool(me["location"] and fold_accents(me["location"].strip()) in where) \
                or any(fold_accents(a["location"]) == where for a in applied)
            reasons = ([f"Khớp kỹ năng: {', '.join(skills)}"] if skills else []) \
                + (["Cùng ngành với việc bạn đã ứng tuyển"] if industry else []) \
                + ([f"Địa điểm phù hợp: {p['location']}"] if location else [])
            if reasons:
                scored.append((3 * len(skills) + 2 * industry + location, p, reasons))
        scored.sort(key=lambda s: (-s[0], -s[1]["created_at"].timestamp(), str(s[1]["id"])))
        return [RecommendedPosting.model_validate({**p, "match_reasons": r}) for _, p, r in scored[:RECOMMENDATION_LIMIT]]

    def list(self, candidate_id: UUID) -> list[JobAlert]:
        return [a for owner, a in reversed(self.alerts.values()) if owner == candidate_id]

    def create(self, candidate_id: UUID, data: JobAlertInput) -> JobAlert:
        if candidate_id not in self.profiles:  # = job_alerts_insert_own: Candidates only
            raise PermissionError("new row violates row-level security policy")
        if sum(1 for owner, _ in self.alerts.values() if owner == candidate_id) >= ALERT_LIMIT:
            raise AlertError("ALERT_LIMIT")
        alert = JobAlert(id=uuid4(), name=data.name, filter=data.filter.stored(), active=True,
                         created_at=datetime.now(UTC), last_matched_at=None)
        self.alerts[alert.id] = (candidate_id, alert)
        return alert

    def set_active(self, candidate_id: UUID, alert_id: UUID, active: bool) -> JobAlert | None:
        owner, alert = self.alerts.get(alert_id, (None, None))
        if owner != candidate_id or alert is None:
            return None
        alert.active = active
        return alert

    def delete(self, candidate_id: UUID, alert_id: UUID) -> bool:
        if self.alerts.get(alert_id, (None,))[0] != candidate_id:
            return False
        del self.alerts[alert_id]
        return True
