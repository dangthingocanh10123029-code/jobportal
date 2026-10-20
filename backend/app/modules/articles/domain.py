import math
import re
from typing import Literal

from app.errors import DomainError
from app.modules.postings.domain import fold_accents

ArticleCategory = Literal["CV", "INTERVIEW", "SALARY", "CAREER", "WORKPLACE"]
ArticleStatus = Literal["DRAFT", "PUBLISHED"]
CATEGORIES = ("CV", "INTERVIEW", "SALARY", "CAREER", "WORKPLACE")
PAGE_SIZE = 12
RELATED_LIMIT = 3
TITLE_LEN, EXCERPT_LEN, CONTENT_LEN = (5, 200), (20, 300), (100, 50000)

# Codes are the messages raised by the RPCs in supabase/migrations/*_articles.sql.
_ERRORS = {
    "NOT_ADMIN": (403, "Chỉ quản trị viên được thực hiện thao tác này"),
    "ARTICLE_NOT_FOUND": (404, "Không tìm thấy bài viết"),
    "INVALID_ARTICLE": (422, "Thông tin bài viết chưa hợp lệ"),
    "INVALID_LENGTH": (422, "Tiêu đề 5–200, tóm tắt 20–300, nội dung 100–50.000 ký tự"),
    "INVALID_SLUG": (422, "Đường dẫn cần ít nhất 3 chữ cái hoặc chữ số"),
    "SLUG_TAKEN": (409, "Đường dẫn bài viết đã tồn tại, vui lòng thử lại"),
}


class ArticleError(DomainError):
    def __init__(self, code: str):
        super().__init__(*_ERRORS[code])
        self.code = code

    @staticmethod
    def is_code(message: str) -> bool:
        return message in _ERRORS


def slugify(text: str) -> str:
    """"Viết CV ấn tượng!" → "viet-cv-an-tuong"; at most 190 chars so the RPC can append -2, -3…"""
    return re.sub(r"[^a-z0-9]+", "-", fold_accents(text)).strip("-")[:190].strip("-")


def reading_minutes(content: str) -> int:
    """ceil(words / 200), at least 1; mirrors the generated column articles.reading_minutes."""
    return max(1, math.ceil(len(content.split()) / 200))


def cover_image(category: str) -> str:
    return f"/images/articles/{category.lower()}.svg"


def page_json(items: list[dict], total: int, page: int) -> dict:
    return {"items": items, "total": total, "page": page, "pageSize": PAGE_SIZE}
