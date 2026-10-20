from typing import Literal

from app.errors import DomainError

InterviewMode = Literal["ONLINE", "ONSITE"]
InterviewStatus = Literal["PROPOSED", "CONFIRMED", "DECLINED", "RESCHEDULE_REQUESTED", "CANCELLED", "DONE"]
InterviewResponse = Literal["CONFIRM", "DECLINE", "RESCHEDULE"]
InterviewScope = Literal["upcoming", "past"]

PENDING: tuple[InterviewStatus, ...] = ("PROPOSED", "CONFIRMED")  # = interviews_one_pending_per_application
CANCELLABLE: tuple[InterviewStatus, ...] = ("PROPOSED", "CONFIRMED", "RESCHEDULE_REQUESTED")
RESPONSE_STATUS: dict[InterviewResponse, InterviewStatus] = {
    "CONFIRM": "CONFIRMED", "DECLINE": "DECLINED", "RESCHEDULE": "RESCHEDULE_REQUESTED",
}
MAX_DAYS_AHEAD = 90

_ERRORS = {
    "APPLICATION_NOT_FOUND": (404, "Không tìm thấy hồ sơ"),
    "APPLICATION_NOT_INTERVIEWABLE": (409, "Chỉ đặt lịch phỏng vấn cho hồ sơ đang xem xét hoặc đang phỏng vấn"),
    "INVALID_SCHEDULE_TIME": (422, "Giờ phỏng vấn phải ở tương lai và trong vòng 90 ngày"),
    "INTERVIEW_ALREADY_PENDING": (409, "Hồ sơ đã có lịch phỏng vấn đang chờ hoặc đã xác nhận"),
    "INTERVIEW_NOT_FOUND": (404, "Không tìm thấy lịch phỏng vấn"),
    "INVALID_RESPONSE": (422, "Phản hồi không hợp lệ"),
    "INVALID_INTERVIEW_STATE": (409, "Lịch phỏng vấn không còn ở trạng thái cho phép thao tác này"),
    "RESCHEDULE_NOTE_REQUIRED": (422, "Vui lòng ghi chú giờ bạn muốn đổi"),
    "INVALID_CANCEL_REASON": (422, "Lý do hủy tối đa 500 ký tự"),
    "INTERVIEW_NOT_DUE": (409, "Chỉ đánh dấu đã phỏng vấn sau giờ hẹn"),
}


class InterviewError(DomainError):
    """Business-rule refusal; the RPCs in *_interviews.sql raise the same codes as exception messages."""

    def __init__(self, code: str):
        super().__init__(*_ERRORS[code])
        self.code = code

    @staticmethod
    def is_code(text: str) -> bool:
        return text in _ERRORS
