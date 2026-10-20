from dataclasses import dataclass, field
from datetime import UTC, datetime
from uuid import uuid4

from app.modules.reviews.domain import ReviewError
from app.modules.reviews.repository import Row

PUBLIC = ("id", "companyId", "rating", "title", "pros", "cons", "authorName", "anonymous", "createdAt")


def _public(r: Row) -> Row:
    return {k: r[k] for k in PUBLIC}


@dataclass
class InMemoryReviewRepository:
    """Acts as `user_id`; `applied` = (candidate, company) pairs with an application."""

    user_id: str = "candidate"
    is_admin: bool = False
    applied: set[tuple[str, str]] = field(default_factory=set)
    names: dict[str, str] = field(default_factory=dict)
    reviews: dict[str, Row] = field(default_factory=dict)
    audit: list[Row] = field(default_factory=list)
    notifications: list[Row] = field(default_factory=list)

    def _approved(self, company_id):
        rows = [r for r in self.reviews.values() if r["companyId"] == company_id and r["status"] == "APPROVED"]
        return sorted(rows, key=lambda r: (r["createdAt"], r["id"]), reverse=True)

    def _mine(self, company_id):
        return next((r for r in self.reviews.values()
                     if r["companyId"] == company_id and r["candidateId"] == self.user_id), None)

    def list_approved(self, company_id, offset, limit):
        rows = self._approved(company_id)
        return [_public(r) for r in rows[offset:offset + limit]], len(rows)

    def rating_counts(self, company_id):
        counts: dict[int, int] = {}
        for r in self._approved(company_id):
            counts[r["rating"]] = counts.get(r["rating"], 0) + 1
        return counts

    def get_mine(self, company_id):
        r = self._mine(company_id)
        return {**_public(r), "status": r["status"], "rejectReason": r["rejectReason"]} if r else None

    def can_review(self, company_id):
        return (self.user_id, company_id) in self.applied and self._mine(company_id) is None

    def submit(self, company_id, rating, title, pros, cons, anonymous):
        if (self.user_id, company_id) not in self.applied:
            raise ReviewError("NOT_ELIGIBLE")
        review = self._mine(company_id)
        if review is not None and review["status"] != "REJECTED":
            raise ReviewError("REVIEW_EXISTS")
        review = review or {"id": str(uuid4()), "companyId": company_id, "candidateId": self.user_id,
                            "createdAt": datetime.now(UTC).isoformat()}
        name = "Ứng viên ẩn danh" if anonymous else self.names.get(self.user_id, "Ứng viên")
        review.update(rating=rating, title=title, pros=pros, cons=cons, anonymous=anonymous, authorName=name,
                      status="PENDING", rejectReason=None)
        self.reviews[review["id"]] = review

    def list_admin(self, status, offset, limit):
        if not self.is_admin:
            return [], 0
        rows = sorted((r for r in self.reviews.values() if status in (None, r["status"])),
                      key=lambda r: (r["createdAt"], r["id"]), reverse=True)
        return [{**_public(r), "status": r["status"], "rejectReason": r["rejectReason"],
                 "companyName": self.names.get(r["companyId"], ""), "authorEmail": f"{r['candidateId']}@test"}
                for r in rows[offset:offset + limit]], len(rows)

    def moderate(self, review_id, approve, reason):
        if not self.is_admin:
            raise ReviewError("NOT_ADMIN")
        r = self.reviews.get(review_id)
        if r is None:
            raise ReviewError("REVIEW_NOT_FOUND")
        r.update(status="APPROVED" if approve else "REJECTED", rejectReason=None if approve else reason)
        self.audit.append({"action": "REVIEW_APPROVED" if approve else "REVIEW_REJECTED", "targetId": review_id})
        self.notifications.append({"recipientId": r["candidateId"], "type": "REVIEW_MODERATED"})
