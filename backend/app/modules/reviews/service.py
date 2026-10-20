from app.modules.reviews.domain import (
    PAGE_SIZE,
    REASON_LEN,
    STATUSES,
    TEXT_LEN,
    TITLE_LEN,
    ReviewError,
    page_json,
    rating_json,
)
from app.modules.reviews.repository import ReviewRepository, Row


def _page(page: int) -> int:
    return min(max(page, 1), 1000)


def _within(text: str, bounds: tuple[int, int]) -> bool:
    return bounds[0] <= len(text) <= bounds[1]


class ReviewService:
    def __init__(self, repo: ReviewRepository):
        self.repo = repo

    def list_company(self, company_id: str, page: int) -> dict:
        """APPROVED reviews, newest first, with the company's CompanyRating."""
        page = _page(page)
        rows, total = self.repo.list_approved(company_id, (page - 1) * PAGE_SIZE, PAGE_SIZE)
        return {"rating": rating_json(self.repo.rating_counts(company_id)), **page_json(rows, total, page)}

    def get_mine(self, company_id: str) -> Row | None:
        return self.repo.get_mine(company_id)

    def can_review(self, company_id: str) -> bool:
        return self.repo.can_review(company_id)

    def submit(self, company_id: str, rating: int, title: str, pros: str, cons: str, anonymous: bool) -> Row:
        title, pros, cons = title.strip(), pros.strip(), cons.strip()
        if not (1 <= rating <= 5 and _within(title, TITLE_LEN) and _within(pros, TEXT_LEN)
                and _within(cons, TEXT_LEN)):
            raise ReviewError("INVALID_REVIEW")
        self.repo.submit(company_id, rating, title, pros, cons, anonymous)
        mine = self.repo.get_mine(company_id)
        if mine is None:
            raise ReviewError("REVIEW_NOT_FOUND")
        return mine

    def list_admin(self, status: str | None, page: int) -> dict:
        page = _page(page)
        rows, total = self.repo.list_admin(status if status in STATUSES else None, (page - 1) * PAGE_SIZE, PAGE_SIZE)
        return page_json(rows, total, page)

    def moderate(self, review_id: str, approve: bool, reason: str | None) -> None:
        """Rejecting needs a 5–500 character reason; approving drops any reason sent."""
        reason = None if approve else (reason or "").strip()
        if reason is not None and not _within(reason, REASON_LEN):
            raise ReviewError("INVALID_REASON")
        self.repo.moderate(review_id, approve, reason)
