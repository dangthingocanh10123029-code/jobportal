import unicodedata
from datetime import datetime
from typing import Literal

from app.errors import DomainError

PostingStatus = Literal["DRAFT", "PUBLISHED", "CLOSED"]
DisplayStatus = Literal["DRAFT", "PUBLISHED", "CLOSED", "EXPIRED"]

# Mirrored by the job_postings_guard trigger in supabase/migrations/*_job_postings.sql.
TRANSITIONS: dict[str, tuple[PostingStatus, PostingStatus]] = {
    "publish": ("DRAFT", "PUBLISHED"),
    "close": ("PUBLISHED", "CLOSED"),
}
EDITABLE: tuple[PostingStatus, ...] = ("DRAFT", "PUBLISHED")


def display_status(status: PostingStatus, deadline: datetime, now: datetime) -> DisplayStatus:
    """ADR-0001: EXPIRED = PUBLISHED and deadline already passed."""
    return "EXPIRED" if status == "PUBLISHED" and deadline < now else status


def is_open(status: PostingStatus, deadline: datetime, now: datetime) -> bool:
    """Accepts Applications. Mirrored by the open_job_postings view."""
    return display_status(status, deadline, now) == "PUBLISHED"


def is_featured(featured_until: datetime | None, now: datetime) -> bool:
    """Ticket 47: a paid (simulated) featuring still running. Mirrored by the 'newest' ORDER BY in postgres.py."""
    return featured_until is not None and featured_until > now


def fold_accents(text: str) -> str:
    """Accent- and case-insensitive form ("Kế toán" → "ke toan", "Đ" → "d"); mirrors public.f_unaccent."""
    stripped = "".join(c for c in unicodedata.normalize("NFD", text) if not unicodedata.category(c).startswith("M"))
    return stripped.replace("đ", "d").replace("Đ", "d").lower()


def meets_min_salary(salary_max: int | None, min_salary: int) -> bool:
    """Spec (Search): salary_max null = negotiable / no upper bound, never filtered out."""
    return salary_max is None or salary_max >= min_salary


_ERRORS = {
    "NOT_FOUND": (404, "Không tìm thấy tin tuyển dụng"),
    "NOT_EDITABLE": (409, "Tin đã đóng, không thể sửa"),
    "INVALID_TRANSITION": (409, "Không thể chuyển tin sang trạng thái này"),
    "DEADLINE_NOT_IN_FUTURE": (422, "Hạn nộp hồ sơ phải ở tương lai"),
    "INVALID_SALARY": (422, "Lương tối thiểu không được lớn hơn lương tối đa"),
}


class PostingError(DomainError):
    def __init__(self, code: str):
        super().__init__(*_ERRORS[code])
        self.code = code
