from typing import Literal

from app.errors import DomainError

ApplicationStatus = Literal["SUBMITTED", "REVIEWING", "INTERVIEWING", "OFFERED", "HIRED", "REJECTED", "WITHDRAWN"]

CLOSED: tuple[ApplicationStatus, ...] = ("WITHDRAWN", "REJECTED", "HIRED")  # = conversations.can_send
MAX_BODY = 2000
PAGE_SIZE = 50
RATE_LIMIT = 30  # messages per minute per sender, = send_message

_ERRORS = {
    "APPLICATION_NOT_FOUND": (404, "Không tìm thấy hồ sơ"),
    "CONVERSATION_CLOSED": (409, "Hồ sơ đã kết thúc, không thể gửi tin nhắn"),
    "INVALID_MESSAGE": (422, "Tin nhắn từ 1 đến 2000 ký tự"),
    "MESSAGE_RATE_LIMITED": (429, "Bạn gửi tin quá nhanh, vui lòng thử lại sau ít phút"),
}


class MessageError(DomainError):
    """Business-rule refusal; the RPCs in *_messages.sql raise the same codes as exception messages."""

    def __init__(self, code: str):
        super().__init__(*_ERRORS[code])
        self.code = code

    @staticmethod
    def is_code(text: str) -> bool:
        return text in _ERRORS
