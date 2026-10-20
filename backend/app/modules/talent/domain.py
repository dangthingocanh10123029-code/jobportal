from app.errors import DomainError

PAGE_SIZE = 20
INVITE_LIMIT = 20  # invitations per Employer per rolling 24 hours, = invite_talent

_ERRORS = {
    "TALENT_NOT_FOUND": (404, "Không tìm thấy ứng viên"),
    "POSTING_NOT_OPEN": (422, "Chỉ mời được vào tin đang mở của bạn"),
    "INVALID_INVITE_MESSAGE": (422, "Lời nhắn tối đa 1000 ký tự"),
    "ALREADY_INVITED": (409, "Bạn đã mời ứng viên này vào tin này"),
    "INVITE_LIMIT": (429, "Bạn đã gửi tối đa 20 lời mời trong 24 giờ, vui lòng thử lại sau"),
}


class TalentError(DomainError):
    """Business-rule refusal; invite_talent (*_talent.sql) raises the same codes as exception messages."""

    def __init__(self, code: str):
        super().__init__(*_ERRORS[code])
        self.code = code

    @staticmethod
    def is_code(text: str) -> bool:
        return text in _ERRORS
