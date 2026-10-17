from urllib.parse import urlparse

from app.errors import DomainError
from app.modules.companies.domain import CompanyPage
from app.modules.companies.repository import CompanyRepository

SIZES = {"S1_10", "S11_50", "S51_200", "S201_500", "S500_PLUS"}
PAGE_SIZE = 20


class CompanyService:
    def __init__(self, repo: CompanyRepository):
        self.repo = repo

    def get(self, company_id: str):
        return self.repo.get(company_id)

    def list(self, q: str | None = None, page: int = 1):
        page = max(page, 1)
        rows, total = self.repo.list(
            (q or "").strip() or None, (page - 1) * PAGE_SIZE, PAGE_SIZE
        )
        return CompanyPage(rows, total, page)

    def update(self, company_id: str, values: dict):
        changes = {}
        for key, label, maximum in (
            ("name", "Tên công ty", 150),
            ("about", "Giới thiệu", 5000),
            ("address", "Địa chỉ", 300),
            ("website", "Website", 300),
        ):
            if key not in values:
                continue
            value = values[key]
            if not isinstance(value, str):
                raise DomainError(422, f"{label} không hợp lệ")
            value = value.strip()
            if key == "name" and not value:
                raise DomainError(422, "Vui lòng nhập tên công ty")
            if len(value) > maximum:
                raise DomainError(422, f"{label} tối đa {maximum} ký tự")
            if key == "website" and value:
                parsed = urlparse(value)
                if parsed.scheme not in ("http", "https") or not parsed.hostname:
                    raise DomainError(
                        422, "Website phải bắt đầu bằng http:// hoặc https://"
                    )
            changes[key] = value or None if key != "name" else value
        if "size" in values:
            if values["size"] is not None and values["size"] not in SIZES:
                raise DomainError(422, "Quy mô công ty không hợp lệ")
            changes["size"] = values["size"]
        if "logoUrl" in values:
            changes["logoUrl"] = values["logoUrl"]
        result = self.repo.update(company_id, changes)
        if result is None:
            raise DomainError(404, "Không tìm thấy hồ sơ công ty")
        return result
