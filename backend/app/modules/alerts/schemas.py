from datetime import datetime
from typing import Annotated, Any
from uuid import UUID

from pydantic import BeforeValidator, ConfigDict, StrictBool, model_validator

from app.modules.cv.schemas import _text
from app.modules.postings.schemas import (
    EmploymentType,
    Industry,
    JobLevel,
    PostingSummary,
    _integer,
)
from app.schemas import CamelModel

# Limits = docs/api-contract.md §44, job_alert_filter_valid() in *_job_alerts.sql and alerts-schema.ts (Zod).


def _min_salary(v: Any) -> Any:
    if v is None:
        return v
    v = _integer(v, "Lương tối thiểu")
    if not 1 <= v <= 2**53 - 1:
        raise ValueError("Lương tối thiểu phải lớn hơn 0" if v < 1 else "Dữ liệu không hợp lệ")
    return v


class AlertFilter(CamelModel):
    """The search filter subset an alert saves; stored as camelCase JSON without the unset keys."""

    model_config = ConfigDict(extra="forbid")

    q: Annotated[str | None, _text("Từ khóa", 100, optional=True)] = None
    location: Annotated[str | None, _text("Địa điểm", 100, optional=True)] = None
    employment_type: EmploymentType | None = None
    industry: Industry | None = None
    level: JobLevel | None = None
    min_salary: Annotated[int | None, BeforeValidator(_min_salary)] = None

    @model_validator(mode="after")
    def _not_empty(self) -> "AlertFilter":
        if not self.stored():
            raise ValueError("Bộ lọc cần ít nhất 1 điều kiện")
        return self

    def stored(self) -> dict[str, Any]:
        return self.model_dump(by_alias=True, exclude_none=True)


class JobAlertInput(CamelModel):
    model_config = ConfigDict(extra="forbid")

    name: Annotated[str, _text("Tên thông báo", 100)]
    filter: AlertFilter


class JobAlertUpdate(CamelModel):
    model_config = ConfigDict(extra="forbid")

    active: StrictBool


class JobAlert(CamelModel):
    id: UUID
    name: str
    filter: dict[str, Any]  # as stored: only the keys the Candidate set
    active: bool
    created_at: datetime
    last_matched_at: datetime | None


class RecommendedPosting(PostingSummary):
    match_reasons: list[str]
