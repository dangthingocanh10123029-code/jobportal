from typing import Any, Protocol

Row = dict[str, Any]


class BillingRepository(Protocol):
    """Rows are camelCase ServicePackage / Order (+ employerEmail, companyName for admin) of contract §47."""

    def list_packages(self, active_only: bool) -> list[Row]:
        """Cheapest first. Non-admins only ever see active packages (RLS)."""
        ...
    def get_package(self, package_id: str) -> Row | None: ...
    def save_package(self, package_id: str | None, code: str, name: str, description: str, price_vnd: int,
                     duration_days: int, active: bool) -> str:
        """Create (id None) or update; writes the PACKAGE_UPDATED audit entry. ADMIN only."""
        ...
    def create_order(self, package_id: str, posting_id: str) -> str:
        """PENDING order at the package's current price, for the caller's open posting; one PENDING per posting."""
        ...
    def pay_order(self, order_id: str) -> None:
        """SIMULATED: PENDING → PAID; featured_until = max(now, featured_until) + days; ORDER_PAID notification."""
        ...
    def cancel_order(self, order_id: str) -> None:
        """PENDING → CANCELLED."""
        ...
    def get_order(self, order_id: str) -> Row | None:
        """The caller's own order."""
        ...
    def list_my_orders(self) -> list[Row]:
        """Newest first."""
        ...
    def list_admin_orders(self, status: str | None, offset: int, limit: int) -> tuple[list[Row], int]: ...
