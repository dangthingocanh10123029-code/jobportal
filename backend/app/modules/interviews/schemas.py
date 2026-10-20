import re
from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import field_validator, model_validator

from app.modules.interviews.domain import (
    InterviewMode,
    InterviewResponse,
    InterviewStatus,
)
from app.schemas import CamelModel

_URL = re.compile(r"^https?://\S+$", re.IGNORECASE)  # = interviews_location_valid


class Interview(CamelModel):
    id: UUID
    application_id: UUID
    posting_id: UUID
    posting_title: str
    company_name: str
    candidate_name: str
    scheduled_at: datetime
    duration_minutes: int
    mode: InterviewMode
    location: str
    note: str | None
    status: InterviewStatus
    candidate_note: str | None
    created_at: datetime
    updated_at: datetime


def _text(value: Any, limit: int, message: str) -> Any:
    """Trimmed; blank → None; longer than `limit` → ValueError(message)."""
    if not isinstance(value, str):
        return value
    value = value.strip() or None
    if value and len(value) > limit:
        raise ValueError(message)
    return value


class InterviewInput(CamelModel):
    """Body of POST /applications/{id}/interviews; same rules and messages as scheduleInterviewSchema (Zod)
    and the table CHECKs. The time window (future, ≤ 90 days) is checked by schedule_interview against now()."""

    scheduled_at: datetime
    duration_minutes: int
    mode: InterviewMode
    location: str
    note: str | None = None

    @field_validator("scheduled_at", mode="before")
    @classmethod
    def _aware(cls, v: Any) -> Any:
        try:
            at = datetime.fromisoformat(v) if isinstance(v, str) else v
        except ValueError:
            at = None
        if not isinstance(at, datetime) or at.tzinfo is None:
            raise ValueError("Giờ phỏng vấn không hợp lệ")
        return at

    @field_validator("duration_minutes", mode="before")
    @classmethod
    def _duration(cls, v: Any) -> Any:
        if not (isinstance(v, int | float) and not isinstance(v, bool) and float(v).is_integer() and 15 <= v <= 240):
            raise ValueError("Thời lượng phải từ 15 đến 240 phút")
        return int(v)

    @field_validator("note", mode="before")
    @classmethod
    def _note(cls, v: Any) -> Any:
        return _text(v, 1000, "Ghi chú tối đa 1000 ký tự")

    @model_validator(mode="after")
    def _location(self) -> "InterviewInput":
        self.location = self.location.strip()
        if self.mode == "ONLINE" and not (_URL.match(self.location) and len(self.location) <= 500):
            raise ValueError("Link phỏng vấn phải là URL http(s)")
        if self.mode == "ONSITE" and not 5 <= len(self.location) <= 300:
            raise ValueError("Địa chỉ phỏng vấn từ 5 đến 300 ký tự")
        return self


class RespondInput(CamelModel):
    response: InterviewResponse
    note: str | None = None

    @field_validator("note", mode="before")
    @classmethod
    def _note(cls, v: Any) -> Any:
        return _text(v, 500, "Ghi chú tối đa 500 ký tự")

    @model_validator(mode="after")
    def _reschedule_note(self) -> "RespondInput":
        if self.response == "RESCHEDULE" and self.note is None:
            raise ValueError("Vui lòng ghi chú giờ bạn muốn đổi")
        return self


class CancelInput(CamelModel):
    reason: str | None = None

    @field_validator("reason", mode="before")
    @classmethod
    def _reason(cls, v: Any) -> Any:
        return _text(v, 500, "Lý do hủy tối đa 500 ký tự")
