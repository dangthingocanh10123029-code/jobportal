from datetime import datetime
from uuid import UUID

from app.auth import Role
from app.modules.applications.domain import ApplicationStatus
from app.schemas import CamelModel


class Application(CamelModel):
    id: UUID
    job_posting_id: UUID
    candidate_id: UUID
    status: ApplicationStatus
    created_at: datetime
    updated_at: datetime


class CandidateApplicationSummary(Application):
    posting_title: str
    company_name: str


class StatusChange(CamelModel):
    from_status: ApplicationStatus | None
    to_status: ApplicationStatus
    changed_by_role: Role
    changed_at: datetime


class CandidateApplicationDetail(CandidateApplicationSummary):
    history: list[StatusChange]


class EmployerApplicationSummary(Application):
    candidate_name: str
    candidate_phone: str | None
    candidate_headline: str | None
    candidate_skills: list[str]


class StatusChangeInput(CamelModel):
    to_status: ApplicationStatus


class ResumeUrl(CamelModel):
    url: str
    expires_in_seconds: int
