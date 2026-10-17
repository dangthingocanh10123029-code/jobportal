from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any, Literal, get_args
from uuid import UUID

from pydantic import field_validator

from app.modules.postings.domain import DisplayStatus, PostingStatus
from app.schemas import CamelModel

EmploymentType = Literal["FULL_TIME", "PART_TIME", "INTERNSHIP", "CONTRACT"]
Industry = Literal[
    "IT_SOFTWARE", "SALES", "MARKETING", "ACCOUNTING_FINANCE", "HR", "ADMIN", "CUSTOMER_SERVICE", "EDUCATION",
    "HEALTHCARE", "CONSTRUCTION", "MANUFACTURING", "LOGISTICS", "HOSPITALITY", "DESIGN", "LEGAL", "OTHER",
]
JobLevel = Literal["INTERN", "FRESHER", "JUNIOR", "MIDDLE", "SENIOR", "LEAD", "MANAGER"]
PostingSort = Literal["newest", "salary_desc", "deadline_asc"]

PAGE_SIZE = 20
MAX_PAGE = 1000
MAX_SKILLS = 10


class PostingFields(CamelModel):
    title: str
    description: str
    location: str
    employment_type: EmploymentType
    salary_min: int | None
    salary_max: int | None
    application_deadline: datetime
    industry: Industry
    level: JobLevel
    experience_years: int
    headcount: int
    skills: list[str]
    requirements: str
    benefits: str


def _require(ok: bool, message: str) -> None:
    if not ok:
        raise ValueError(message)


def _integer(value: Any, label: str, nullable: bool = False) -> Any:
    if value is None and nullable:
        return value
    _require(isinstance(value, int | float) and not isinstance(value, bool), f"{label} phải là số")
    _require(float(value).is_integer(), f"{label} phải là số nguyên")
    return int(value)


class PostingInput(PostingFields):
    """Request body of create/update; same rules and messages as postingInputSchema (Zod) and the DB CHECKs."""

    @field_validator("title", "description", "location", "requirements", "benefits", mode="before")
    @classmethod
    def _trim(cls, v: Any) -> Any:
        return v.strip() if isinstance(v, str) else v

    @field_validator("title")
    @classmethod
    def _title(cls, v: str) -> str:
        _require(len(v) >= 5, "Tiêu đề tối thiểu 5 ký tự")
        _require(len(v) <= 150, "Tiêu đề tối đa 150 ký tự")
        return v

    @field_validator("description")
    @classmethod
    def _description(cls, v: str) -> str:
        _require(len(v) >= 20, "Mô tả tối thiểu 20 ký tự")
        return v

    @field_validator("location")
    @classmethod
    def _location(cls, v: str) -> str:
        _require(len(v) >= 1, "Vui lòng nhập địa điểm")
        _require(len(v) <= 100, "Địa điểm tối đa 100 ký tự")
        return v

    @field_validator("requirements", "benefits")
    @classmethod
    def _long_text(cls, v: str, info: Any) -> str:
        label = "Yêu cầu" if info.field_name == "requirements" else "Quyền lợi"
        _require(len(v) >= 10, f"{label} tối thiểu 10 ký tự")
        _require(len(v) <= 5000, f"{label} tối đa 5000 ký tự")
        return v

    @field_validator("employment_type", "industry", "level", mode="before")
    @classmethod
    def _choice(cls, v: Any, info: Any) -> Any:
        allowed, message = {
            "employment_type": (EmploymentType, "Loại hình công việc không hợp lệ"),
            "industry": (Industry, "Ngành nghề không hợp lệ"),
            "level": (JobLevel, "Cấp bậc không hợp lệ"),
        }[info.field_name]
        _require(v in get_args(allowed), message)
        return v

    @field_validator("salary_min", "salary_max", mode="before")
    @classmethod
    def _salary(cls, v: Any) -> Any:
        v = _integer(v, "Lương", nullable=True)
        _require(v is None or v >= 0, "Lương không được âm")
        return v

    @field_validator("experience_years", mode="before")
    @classmethod
    def _experience(cls, v: Any) -> int:
        v = _integer(v, "Số năm kinh nghiệm")
        _require(v >= 0, "Số năm kinh nghiệm không được âm")
        _require(v <= 20, "Số năm kinh nghiệm tối đa 20")
        return v

    @field_validator("headcount", mode="before")
    @classmethod
    def _headcount(cls, v: Any) -> int:
        v = _integer(v, "Số lượng tuyển")
        _require(v >= 1, "Số lượng tuyển tối thiểu 1")
        _require(v <= 999, "Số lượng tuyển tối đa 999")
        return v

    # Offset required: a bare "2026-10-20T10:00" would be read in the server's timezone.
    @field_validator("application_deadline", mode="before")
    @classmethod
    def _deadline(cls, v: Any) -> datetime:
        try:
            parsed = datetime.fromisoformat(v) if isinstance(v, str) and "T" in v else None
        except ValueError:
            parsed = None
        _require(parsed is not None and parsed.tzinfo is not None, "Hạn nộp hồ sơ không hợp lệ")
        return parsed.astimezone(UTC)

    # Mirrored by valid_skills in supabase/migrations.
    @field_validator("skills", mode="before")
    @classmethod
    def _skills(cls, v: Any) -> Any:
        if not isinstance(v, list):
            return v
        _require(len(v) <= MAX_SKILLS, f"Tối đa {MAX_SKILLS} kỹ năng")
        skills = [s.strip() if isinstance(s, str) else s for s in v]
        for s in skills:
            _require(not isinstance(s, str) or len(s) >= 1, "Kỹ năng không được để trống")
            _require(not isinstance(s, str) or len(s) <= 30, "Mỗi kỹ năng tối đa 30 ký tự")
        _require(len({str(s).lower() for s in skills}) == len(skills), "Kỹ năng bị trùng")
        return skills


class StoredPosting(PostingFields):
    """As stored: EXPIRED is never stored (ADR-0001)."""

    id: UUID
    employer_id: UUID
    company_name: str
    company_logo_url: str | None
    status: PostingStatus
    created_at: datetime
    updated_at: datetime


class JobPosting(StoredPosting):
    display_status: DisplayStatus


class PostingDetail(JobPosting):
    is_open: bool


class PostingSummary(CamelModel):
    id: UUID
    employer_id: UUID
    title: str
    company_name: str
    company_logo_url: str | None
    location: str
    employment_type: EmploymentType
    salary_min: int | None
    salary_max: int | None
    application_deadline: datetime
    created_at: datetime
    industry: Industry
    level: JobLevel
    experience_years: int
    skills: list[str]


class OpenPostingsPage(CamelModel):
    items: list[PostingSummary]
    total: int
    page: int
    page_size: int = PAGE_SIZE


@dataclass(frozen=True)
class SearchFilter:
    """Every given criterion must match; blank text fields are already None."""

    q: str | None = None
    location: str | None = None
    employment_type: EmploymentType | None = None
    min_salary: int | None = None
    industry: Industry | None = None
    level: JobLevel | None = None
    max_experience: int | None = None
    skill: str | None = None
    sort: PostingSort = "newest"
    page: int = 1


class SearchQuery(CamelModel):
    """Raw query string of GET /postings; to_filter() drops malformed fields instead of failing (like searchFilterSchema)."""

    q: str | None = None
    location: str | None = None
    type: str | None = None
    industry: str | None = None
    level: str | None = None
    exp: str | None = None
    skill: str | None = None
    min_salary: str | None = None
    sort: str | None = None
    page: str | None = None

    def to_filter(self) -> SearchFilter:
        min_salary = _whole(self.min_salary)
        exp = _whole(self.exp)
        page = _whole(self.page)
        return SearchFilter(
            q=_text(self.q),
            location=_text(self.location),
            employment_type=_one_of(self.type, EmploymentType),
            min_salary=min_salary if min_salary is not None and 0 < min_salary <= 2**53 - 1 else None,
            industry=_one_of(self.industry, Industry),
            level=_one_of(self.level, JobLevel),
            max_experience=exp if exp is not None and 0 <= exp <= 20 else None,
            skill=_text(self.skill),
            sort=_one_of(self.sort, PostingSort) or "newest",
            page=min(page, MAX_PAGE) if page is not None and page >= 1 else 1,
        )


def _text(value: str | None) -> str | None:
    return (value or "").strip()[:100] or None


def _whole(value: str | None) -> int | None:
    try:
        number = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None
    return int(number) if number.is_integer() else None


def _one_of(value: str | None, allowed: Any) -> Any:
    return value if value in get_args(allowed) else None
