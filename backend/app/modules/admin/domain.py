from typing import Literal

from app.errors import DomainError

AuditAction = Literal[
    "USER_LOCKED", "USER_UNLOCKED", "POSTING_HIDDEN", "POSTING_UNHIDDEN", "COMPANY_VERIFIED", "COMPANY_UNVERIFIED",
    "ARTICLE_PUBLISHED", "ARTICLE_UNPUBLISHED"
]
PAGE_SIZE = 20
REASON_MIN, REASON_MAX = 5, 500

# Codes are the messages raised by the admin_* RPCs in supabase/migrations/*_admin.sql.
_ERRORS = {
    "NOT_ADMIN": (403, "Chỉ quản trị viên được thực hiện thao tác này"),
    "USER_NOT_FOUND": (404, "Không tìm thấy người dùng"),
    "CANNOT_LOCK_SELF": (409, "Không thể khóa chính tài khoản của bạn"),
    "CANNOT_LOCK_ADMIN": (409, "Không thể khóa tài khoản quản trị viên"),
    "INVALID_REASON": (422, f"Lý do cần từ {REASON_MIN} đến {REASON_MAX} ký tự"),
    "POSTING_NOT_FOUND": (404, "Không tìm thấy tin tuyển dụng"),
    "COMPANY_NOT_FOUND": (404, "Không tìm thấy công ty"),
}


class AdminError(DomainError):
    def __init__(self, code: str):
        super().__init__(*_ERRORS[code])
        self.code = code

    @staticmethod
    def is_code(message: str) -> bool:
        return message in _ERRORS


def page_json(items: list[dict], total: int, page: int) -> dict:
    return {"items": items, "total": total, "page": page, "pageSize": PAGE_SIZE}
