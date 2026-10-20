from typing import Literal

from app.errors import DomainError

ReviewStatus = Literal["PENDING", "APPROVED", "REJECTED"]
STATUSES = ("PENDING", "APPROVED", "REJECTED")
PAGE_SIZE = 10
TITLE_LEN, TEXT_LEN, REASON_LEN = (5, 150), (10, 3000), (5, 500)

# Codes are the messages raised by the RPCs in supabase/migrations/*_company_reviews.sql.
_ERRORS = {
    "NOT_ADMIN": (403, "Chỉ quản trị viên được thực hiện thao tác này"),
    "NOT_ELIGIBLE": (403, "Bạn cần từng ứng tuyển vào công ty này để viết đánh giá"),
    "REVIEW_EXISTS": (409, "Bạn đã gửi đánh giá cho công ty này"),
    "REVIEW_NOT_FOUND": (404, "Không tìm thấy đánh giá"),
    "INVALID_REVIEW": (422, "Chọn 1–5 sao; tiêu đề 5–150, ưu điểm và nhược điểm 10–3.000 ký tự"),
    "INVALID_REASON": (422, "Lý do cần từ 5 đến 500 ký tự"),
}


class ReviewError(DomainError):
    def __init__(self, code: str):
        super().__init__(*_ERRORS[code])
        self.code = code

    @staticmethod
    def is_code(message: str) -> bool:
        return message in _ERRORS


def rating_json(counts: dict[int, int]) -> dict:
    """CompanyRating from {stars: count} of APPROVED reviews; average rounded to 1 decimal."""
    distribution = {str(s): counts.get(s, 0) for s in range(1, 6)}
    count = sum(distribution.values())
    average = round(sum(s * n for s, n in counts.items()) / count, 1) if count else None
    return {"average": average, "count": count, "distribution": distribution}


def page_json(items: list[dict], total: int, page: int) -> dict:
    return {"items": items, "total": total, "page": page, "pageSize": PAGE_SIZE}
