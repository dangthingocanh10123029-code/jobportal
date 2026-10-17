from app import auth
from app.modules.admin.domain import (
    PAGE_SIZE,
    REASON_MAX,
    REASON_MIN,
    AdminError,
    page_json,
)
from app.modules.admin.repository import AdminRepository, Row

USER_DETAIL_ONLY = ("phone", "postings", "applications")


class AdminService:
    """Admin reads and moderation. The database re-checks is_admin() and writes the audit entry (RPCs)."""

    def __init__(self, repo: AdminRepository):
        self.repo = repo

    def stats(self) -> Row:
        return self.repo.stats()

    def list_users(self, filters: Row, page: int) -> dict:
        return self._page(self.repo.list_users, filters, page)

    def get_user(self, user_id: str) -> Row:
        return _found(self.repo.get_user(user_id), "USER_NOT_FOUND")

    def set_user_lock(self, user_id: str, locked: bool, reason: str | None) -> Row:
        self.repo.set_user_lock(user_id, locked, _reason(reason) if locked else None)
        auth.forget_account(user_id)  # this process stops serving the locked account at once
        user = self.get_user(user_id)
        return {k: v for k, v in user.items() if k not in USER_DETAIL_ONLY}

    def list_postings(self, filters: Row, page: int) -> dict:
        return self._page(self.repo.list_postings, filters, page)

    def set_posting_hidden(self, posting_id: str, hidden: bool, reason: str | None) -> Row:
        self.repo.set_posting_hidden(posting_id, hidden, _reason(reason) if hidden else None)
        return _found(self.repo.get_posting(posting_id), "POSTING_NOT_FOUND")

    def list_companies(self, filters: Row, page: int) -> dict:
        return self._page(self.repo.list_companies, filters, page)

    def set_company_verified(self, company_id: str, verified: bool) -> Row:
        self.repo.set_company_verified(company_id, verified)
        return _found(self.repo.get_company(company_id), "COMPANY_NOT_FOUND")

    def list_audit(self, filters: Row, page: int) -> dict:
        return self._page(self.repo.list_audit, filters, page)

    def _page(self, fetch, filters: Row, page: int) -> dict:
        page = max(page, 1)
        stripped = {k: v.strip() if isinstance(v, str) else v for k, v in filters.items()}
        clean = {k: v for k, v in stripped.items() if v is not None and v != ""}
        items, total = fetch(clean, (page - 1) * PAGE_SIZE, PAGE_SIZE)
        return page_json(items, total, page)


def _reason(reason: str | None) -> str:
    text = (reason or "").strip()
    if not REASON_MIN <= len(text) <= REASON_MAX:
        raise AdminError("INVALID_REASON")
    return text


def _found(row: Row | None, code: str) -> Row:
    if row is None:
        raise AdminError(code)
    return row
