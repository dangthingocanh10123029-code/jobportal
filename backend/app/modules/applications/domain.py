from typing import Literal

from app.auth import Role
from app.errors import DomainError

ApplicationStatus = Literal["SUBMITTED", "REVIEWING", "INTERVIEWING", "OFFERED", "HIRED", "REJECTED", "WITHDRAWN"]

# Spec "Application Status state machine". Mirrors allowedNextStatuses (src/modules/application) and
# public.application_transition_allowed in supabase/migrations/*_applications.sql.
TRANSITIONS: dict[ApplicationStatus, tuple[ApplicationStatus, ...]] = {
    "SUBMITTED": ("REVIEWING", "REJECTED", "WITHDRAWN"),
    "REVIEWING": ("INTERVIEWING", "REJECTED", "WITHDRAWN"),
    "INTERVIEWING": ("OFFERED", "REJECTED", "WITHDRAWN"),
    "OFFERED": ("HIRED", "REJECTED", "WITHDRAWN"),
    "HIRED": (),
    "REJECTED": (),
    "WITHDRAWN": (),
}


def allowed_next_statuses(status: ApplicationStatus, role: Role) -> list[ApplicationStatus]:
    """Statuses `role` may move an Application to next: Candidate only WITHDRAWN, Employer everything else."""
    return [to for to in TRANSITIONS[status] if (to == "WITHDRAWN") == (role == "CANDIDATE")]


MAX_RESUME_BYTES = 5 * 1024 * 1024  # = resumes bucket file_size_limit and MAX_RESUME_BYTES (TS)
PDF_MAGIC = b"%PDF-"


def check_resume(content_type: str | None, content: bytes) -> None:
    """Same rules and messages as submitApplicationSchema (Zod)."""
    if not content:
        raise DomainError(422, "Vui lòng chọn file CV")
    if content_type != "application/pdf":
        raise DomainError(422, "CV phải là file PDF")
    if len(content) > MAX_RESUME_BYTES:
        raise DomainError(422, "CV tối đa 5 MB")
    # The declared type comes from the client; the first bytes do not lie.
    if not content.startswith(PDF_MAGIC):
        raise DomainError(422, "CV phải là file PDF")


_ERRORS = {
    "ALREADY_APPLIED": (409, "Bạn đã nộp hồ sơ cho tin này rồi"),
    "POSTING_NOT_OPEN": (409, "Tin tuyển dụng không còn nhận hồ sơ"),
    "INVALID_RESUME": (422, "CV phải là file PDF, tối đa 5 MB"),
    "APPLICATION_NOT_FOUND": (404, "Không tìm thấy hồ sơ"),
    "INVALID_TRANSITION": (409, "Hồ sơ không thể chuyển sang trạng thái này"),
}


class ApplicationError(DomainError):
    """Business-rule refusal; the RPCs raise the same codes as exception messages."""

    def __init__(self, code: str):
        super().__init__(*_ERRORS[code])
        self.code = code

    @staticmethod
    def is_code(text: str) -> bool:
        return text in _ERRORS
