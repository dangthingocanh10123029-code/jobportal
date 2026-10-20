import re
from typing import Literal

from app.errors import DomainError

OrderStatus = Literal["PENDING", "PAID", "CANCELLED"]
STATUSES = ("PENDING", "PAID", "CANCELLED")
PAGE_SIZE = 20
# Same rules as the service_packages CHECKs and admin_save_package (supabase/migrations/*_billing.sql).
CODE = re.compile(r"[A-Z0-9_]{2,30}")
NAME_LEN, DESCRIPTION_MAX, PRICE_MAX, DAYS = (2, 100), 500, 100_000_000, (1, 90)

# Codes are the messages raised by the RPCs in supabase/migrations/*_billing.sql.
_ERRORS = {
    "NOT_ADMIN": (403, "Chỉ quản trị viên được thực hiện thao tác này"),
    "NOT_EMPLOYER": (403, "Chỉ nhà tuyển dụng được mua gói dịch vụ"),
    "PACKAGE_NOT_FOUND": (404, "Không tìm thấy gói dịch vụ"),
    "POSTING_NOT_ELIGIBLE": (409, "Chỉ đẩy được tin đang mở tuyển của bạn"),
    "ORDER_PENDING_EXISTS": (409, "Tin này đã có một đơn chờ thanh toán"),
    "ORDER_NOT_FOUND": (404, "Không tìm thấy đơn hàng"),
    "ORDER_NOT_PENDING": (409, "Đơn hàng không còn ở trạng thái chờ thanh toán"),
    "PACKAGE_CODE_TAKEN": (409, "Mã gói đã được dùng"),
    "INVALID_PACKAGE": (422, ("Mã gói A–Z, 0–9, _ (2–30 ký tự); tên 2–100 ký tự; mô tả ≤ 500 ký tự; "
                             "giá 0–100.000.000 đ; thời hạn 1–90 ngày")),
}


class BillingError(DomainError):
    def __init__(self, code: str):
        super().__init__(*_ERRORS[code])
        self.code = code

    @staticmethod
    def is_code(message: str) -> bool:
        return message in _ERRORS


def page_json(items: list[dict], total: int, page: int) -> dict:
    return {"items": items, "total": total, "page": page, "pageSize": PAGE_SIZE}
