from app.modules.billing.domain import (
    CODE,
    DAYS,
    DESCRIPTION_MAX,
    NAME_LEN,
    PAGE_SIZE,
    PRICE_MAX,
    STATUSES,
    BillingError,
    page_json,
)
from app.modules.billing.repository import BillingRepository, Row


class BillingService:
    """Packages, orders and the simulated payment. The database re-checks roles and ownership (RPCs)."""

    def __init__(self, repo: BillingRepository):
        self.repo = repo

    def list_packages(self) -> list[Row]:
        return self.repo.list_packages(active_only=True)

    def list_admin_packages(self) -> list[Row]:
        return self.repo.list_packages(active_only=False)

    def save_package(self, package_id: str | None, code: str, name: str, description: str, price_vnd: int,
                     duration_days: int, active: bool) -> Row:
        code, name, description = code.strip(), name.strip(), description.strip()
        if not (CODE.fullmatch(code) and NAME_LEN[0] <= len(name) <= NAME_LEN[1]
                and len(description) <= DESCRIPTION_MAX and 0 <= price_vnd <= PRICE_MAX
                and DAYS[0] <= duration_days <= DAYS[1]):
            raise BillingError("INVALID_PACKAGE")
        saved = self.repo.save_package(package_id, code, name, description, price_vnd, duration_days, active)
        return _found(self.repo.get_package(saved), "PACKAGE_NOT_FOUND")

    def create_order(self, package_id: str, posting_id: str) -> Row:
        return self._order(self.repo.create_order(package_id, posting_id))

    def pay_order(self, order_id: str) -> Row:
        self.repo.pay_order(order_id)
        return self._order(order_id)

    def cancel_order(self, order_id: str) -> Row:
        self.repo.cancel_order(order_id)
        return self._order(order_id)

    def list_my_orders(self) -> list[Row]:
        return self.repo.list_my_orders()

    def list_admin_orders(self, status: str | None, page: int) -> dict:
        page = min(max(page, 1), 1000)
        rows, total = self.repo.list_admin_orders(status if status in STATUSES else None, (page - 1) * PAGE_SIZE,
                                                  PAGE_SIZE)
        return page_json(rows, total, page)

    def _order(self, order_id: str) -> Row:
        return _found(self.repo.get_order(order_id), "ORDER_NOT_FOUND")


def _found(row: Row | None, code: str) -> Row:
    if row is None:
        raise BillingError(code)
    return row
