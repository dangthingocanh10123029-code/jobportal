from dataclasses import dataclass, field

from app.modules.admin.domain import AdminError
from app.modules.admin.repository import Row


@dataclass
class InMemoryAdminRepository:
    """Rows keyed by id; mirrors the RPC refusals of supabase/migrations/*_admin.sql for `actor_id`."""

    actor_id: str = "admin"
    users: dict[str, Row] = field(default_factory=dict)
    postings: dict[str, Row] = field(default_factory=dict)
    companies: dict[str, Row] = field(default_factory=dict)
    audit: list[Row] = field(default_factory=list)

    def stats(self):
        return {"users": {"ADMIN": sum(u["role"] == "ADMIN" for u in self.users.values())}}

    def _page(self, rows, filters, offset, limit):
        rows = [r for r in rows if all(r.get(k) == v for k, v in filters.items() if k != "q")]
        if "q" in filters:
            rows = [r for r in rows if filters["q"].lower() in str(r).lower()]
        return rows[offset : offset + limit], len(rows)

    def list_users(self, filters, offset, limit):
        locked = filters.pop("locked", None)
        rows = [u for u in self.users.values() if locked is None or (u["lockedAt"] is not None) == locked]
        return self._page(rows, filters, offset, limit)

    def get_user(self, user_id):
        return self.users.get(user_id)

    def set_user_lock(self, user_id, locked, reason):
        user = self.users.get(user_id)
        if user is None:
            raise AdminError("USER_NOT_FOUND")
        if user_id == self.actor_id:
            raise AdminError("CANNOT_LOCK_SELF")
        if user["role"] == "ADMIN":
            raise AdminError("CANNOT_LOCK_ADMIN")
        user.update(lockedAt="now" if locked else None, lockedReason=reason)
        self.audit.append({"action": "USER_LOCKED" if locked else "USER_UNLOCKED", "targetId": user_id})

    def list_postings(self, filters, offset, limit):
        return self._page(list(self.postings.values()), filters, offset, limit)

    def get_posting(self, posting_id):
        return self.postings.get(posting_id)

    def set_posting_hidden(self, posting_id, hidden, reason):
        if posting_id not in self.postings:
            raise AdminError("POSTING_NOT_FOUND")
        self.postings[posting_id].update(hiddenAt="now" if hidden else None, hiddenReason=reason)

    def list_companies(self, filters, offset, limit):
        return self._page(list(self.companies.values()), filters, offset, limit)

    def get_company(self, company_id):
        return self.companies.get(company_id)

    def set_company_verified(self, company_id, verified):
        if company_id not in self.companies:
            raise AdminError("COMPANY_NOT_FOUND")
        self.companies[company_id].update(verifiedAt="now" if verified else None, companyVerified=verified)

    def list_audit(self, filters, offset, limit):
        return self._page(self.audit, filters, offset, limit)
