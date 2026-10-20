from collections.abc import Callable
from datetime import UTC, datetime
from uuid import UUID

from app.modules.postings.domain import (
    EDITABLE,
    TRANSITIONS,
    PostingError,
    display_status,
    is_featured,
    is_open,
)
from app.modules.postings.repository import PostingRepository
from app.modules.postings.schemas import (
    PAGE_SIZE,
    JobPosting,
    OpenPostingsPage,
    PostingDetail,
    PostingInput,
    PostingSummary,
    SearchFilter,
    StoredPosting,
)

RELATED_LIMIT = 6

Clock = Callable[[], datetime]


class PostingService:
    """Posting lifecycle (DRAFT --publish--> PUBLISHED --close--> CLOSED) plus the public read side."""

    def __init__(self, repo: PostingRepository, now: Clock = lambda: datetime.now(UTC)):
        self._repo = repo
        self._now = now

    def create_draft(self, employer_id: UUID, data: PostingInput) -> JobPosting:
        _assert_salary(data)
        return self._view(self._repo.insert(employer_id, data))

    def update(self, employer_id: UUID, posting_id: UUID, data: PostingInput) -> JobPosting:
        posting = self._owned(employer_id, posting_id)
        if posting.status not in EDITABLE:
            raise PostingError("NOT_EDITABLE")
        _assert_salary(data)
        return self._view(self._repo.update(posting_id, data.model_dump()))

    def publish(self, employer_id: UUID, posting_id: UUID) -> JobPosting:
        posting = self._transition(employer_id, posting_id, "publish")
        if posting.application_deadline <= self._now():
            raise PostingError("DEADLINE_NOT_IN_FUTURE")
        return self._view(self._repo.update(posting_id, {"status": TRANSITIONS["publish"][1]}))

    def close(self, employer_id: UUID, posting_id: UUID) -> JobPosting:
        self._transition(employer_id, posting_id, "close")
        return self._view(self._repo.update(posting_id, {"status": TRANSITIONS["close"][1]}))

    def list_mine(self, employer_id: UUID) -> list[JobPosting]:
        return [self._view(p) for p in self._repo.list_by_employer(employer_id)]

    def get_mine(self, employer_id: UUID, posting_id: UUID) -> JobPosting | None:
        posting = self._repo.find_by_id(posting_id)
        return self._view(posting) if posting and posting.employer_id == employer_id else None

    def list_open(self, criteria: SearchFilter) -> OpenPostingsPage:
        rows, total = self._repo.list_open(criteria, (criteria.page - 1) * PAGE_SIZE, PAGE_SIZE)
        return OpenPostingsPage(items=[self._summary(r) for r in rows], total=total, page=criteria.page)

    def list_related(self, posting_id: UUID) -> list[PostingSummary]:
        """Up to RELATED_LIMIT open postings in the same industry, newest first; [] for DRAFT or unknown ids."""
        posting = self._repo.find_by_id(posting_id)
        if posting is None or posting.status == "DRAFT":
            return []
        rows, _ = self._repo.list_open(SearchFilter(industry=posting.industry), 0, RELATED_LIMIT + 1)
        return [self._summary(r) for r in rows if r.id != posting_id][:RELATED_LIMIT]

    def get_public(self, posting_id: UUID) -> PostingDetail | None:
        """CLOSED/EXPIRED still readable (is_open false); DRAFT looks missing."""
        posting = self._repo.find_by_id(posting_id)
        if posting is None or posting.status == "DRAFT":
            return None
        open_ = is_open(posting.status, posting.application_deadline, self._now())
        return PostingDetail(**self._view(posting).model_dump(), is_open=open_)

    def record_view(self, posting_id: UUID) -> None:
        """The database decides whether the view counts (see PostingRepository.record_view)."""
        self._repo.record_view(posting_id)

    def _owned(self, employer_id: UUID, posting_id: UUID) -> StoredPosting:
        posting = self._repo.find_by_id(posting_id)
        # Someone else's posting looks the same as a missing one.
        if posting is None or posting.employer_id != employer_id:
            raise PostingError("NOT_FOUND")
        return posting

    def _transition(self, employer_id: UUID, posting_id: UUID, action: str) -> StoredPosting:
        posting = self._owned(employer_id, posting_id)
        if posting.status != TRANSITIONS[action][0]:
            raise PostingError("INVALID_TRANSITION")
        return posting

    def _view(self, posting: StoredPosting) -> JobPosting:
        status = display_status(posting.status, posting.application_deadline, self._now())
        return JobPosting(**posting.model_dump(), display_status=status,
                          featured=is_featured(posting.featured_until, self._now()))

    def _summary(self, posting: StoredPosting) -> PostingSummary:
        return PostingSummary.model_validate(
            {**posting.model_dump(), "featured": is_featured(posting.featured_until, self._now())})


def _assert_salary(data: PostingInput) -> None:
    if data.salary_min is not None and data.salary_max is not None and data.salary_min > data.salary_max:
        raise PostingError("INVALID_SALARY")
