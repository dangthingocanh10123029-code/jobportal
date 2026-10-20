from datetime import datetime
from typing import Annotated, Any
from uuid import UUID

from pydantic import BeforeValidator, ConfigDict, Field

from app.modules.cv.schemas import CvBody, _text
from app.schemas import CamelModel

# Limits = docs/api-contract.md §43, the *_talent.sql CHECKs and talent-schema.ts (Zod).


def _years(v: Any) -> Any:
    if v is not None and (not isinstance(v, int) or isinstance(v, bool) or not 0 <= v <= 50):
        raise ValueError("Số năm kinh nghiệm từ 0 đến 50")
    return v


class OpenToWorkInput(CamelModel):
    """Omitted location/experienceYears stay as they are; blank location clears it."""

    model_config = ConfigDict(extra="forbid")

    open_to_work: bool
    location: Annotated[str | None, _text("Địa điểm", 150, optional=True)] = None
    experience_years: Annotated[int | None, BeforeValidator(_years)] = None


class TalentQuery(CamelModel):
    q: Annotated[str | None, Field(max_length=100)] = None
    skill: Annotated[str | None, Field(max_length=100)] = None
    location: Annotated[str | None, Field(max_length=100)] = None
    min_experience: Annotated[int | None, Field(ge=0, le=50)] = None
    page: Annotated[int, Field(ge=1, le=1000)] = 1


class SaveTalentInput(CamelModel):
    note: Annotated[str | None, _text("Ghi chú", 500, optional=True)] = None


class InviteInput(CamelModel):
    posting_id: UUID
    message: Annotated[str | None, _text("Lời nhắn", 1000, optional=True)] = None


class TalentSummary(CamelModel):
    candidate_id: UUID
    full_name: str
    headline: str | None
    skills: list[str]
    location: str | None
    experience_years: int | None
    has_online_cv: bool
    updated_at: datetime
    saved: bool


class TalentProfile(CamelModel):
    """CandidateProfile without phone."""

    user_id: UUID
    full_name: str
    headline: str | None
    skills: list[str]
    experience: str | None
    education: str | None
    open_to_work: bool = True
    location: str | None
    experience_years: int | None


class TalentCv(CvBody):
    """OnlineCv without email/phone."""

    candidate_id: UUID
    updated_at: datetime


class TalentDetail(TalentSummary):
    profile: TalentProfile
    cv: TalentCv | None


class TalentPage(CamelModel):
    items: list[TalentSummary]
    total: int
    page: int
    page_size: int = 20
