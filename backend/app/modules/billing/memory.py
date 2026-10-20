from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from uuid import uuid4

from app.modules.billing.domain import BillingError
from app.modules.billing.repository import Row

ORDER = ("id", "packageName", "postingId", "postingTitle", "amountVnd", "status", "createdAt", "paidAt",
         "featuredUntil")


@dataclass
class InMemoryBillingRepository:
    """Acts as `user_id`; mirrors the RPC refusals of supabase/migrations/*_billing.sql.
    `postings`: id → {employerId, title, open, featuredUntil}."""

    user_id: str = "employer"
    role: str = "EMPLOYER"
    packages: dict[str, Row] = field(default_factory=dict)
    postings: dict[str, Row] = field(default_factory=dict)
    orders: dict[str, Row] = field(default_factory=dict)
    audit: list[Row] = field(default_factory=list)
    notifications: list[Row] = field(default_factory=list)
    now: datetime = field(default_factory=lambda: datetime.now(UTC))

    def list_packages(self, active_only):
        rows = [p for p in self.packages.values() if p["active"] or (self.role == "ADMIN" and not active_only)]
        return sorted(rows, key=lambda p: (p["priceVnd"], p["code"]))

    def get_package(self, package_id):
        return self.packages.get(package_id)

    def save_package(self, package_id, code, name, description, price_vnd, duration_days, active):
        if self.role != "ADMIN":
            raise BillingError("NOT_ADMIN")
        if package_id is not None and package_id not in self.packages:
            raise BillingError("PACKAGE_NOT_FOUND")
        if any(p["code"] == code and p["id"] != package_id for p in self.packages.values()):
            raise BillingError("PACKAGE_CODE_TAKEN")
        package_id = package_id or str(uuid4())
        self.packages[package_id] = {"id": package_id, "code": code, "name": name, "description": description,
                                     "priceVnd": price_vnd, "durationDays": duration_days, "active": active}
        self.audit.append({"action": "PACKAGE_UPDATED", "targetType": "PACKAGE", "targetId": package_id})
        return package_id

    def _open(self, posting_id):
        posting = self.postings.get(posting_id)
        if posting is None or posting["employerId"] != self.user_id or not posting["open"]:
            raise BillingError("POSTING_NOT_ELIGIBLE")
        return posting

    def _pending(self, order_id):
        order = self.orders.get(order_id)
        if order is None or order["employerId"] != self.user_id:
            raise BillingError("ORDER_NOT_FOUND")
        if order["status"] != "PENDING":
            raise BillingError("ORDER_NOT_PENDING")
        return order

    def create_order(self, package_id, posting_id):
        if self.role != "EMPLOYER":
            raise BillingError("NOT_EMPLOYER")
        package = self.packages.get(package_id)
        if package is None or not package["active"]:
            raise BillingError("PACKAGE_NOT_FOUND")
        posting = self._open(posting_id)
        if any(o["postingId"] == posting_id and o["status"] == "PENDING" for o in self.orders.values()):
            raise BillingError("ORDER_PENDING_EXISTS")
        order_id = str(uuid4())
        self.orders[order_id] = {
            "id": order_id, "employerId": self.user_id, "packageName": package["name"], "postingId": posting_id,
            "postingTitle": posting["title"], "amountVnd": package["priceVnd"], "days": package["durationDays"],
            "status": "PENDING", "createdAt": self.now + timedelta(microseconds=len(self.orders)), "paidAt": None,
            "featuredUntil": None}
        return order_id

    def pay_order(self, order_id):
        order = self._pending(order_id)
        posting = self._open(order["postingId"])
        until = max(self.now, posting["featuredUntil"] or self.now) + timedelta(days=order["days"])
        posting["featuredUntil"] = until
        order.update(status="PAID", paidAt=self.now, featuredUntil=until)
        self.notifications.append({"recipientId": self.user_id, "type": "ORDER_PAID"})

    def cancel_order(self, order_id):
        self._pending(order_id)["status"] = "CANCELLED"

    def get_order(self, order_id):
        order = self.orders.get(order_id)
        return {k: order[k] for k in ORDER} if order and order["employerId"] == self.user_id else None

    def list_my_orders(self):
        rows = [o for o in self.orders.values() if o["employerId"] == self.user_id]
        return [{k: o[k] for k in ORDER} for o in sorted(rows, key=lambda o: o["createdAt"], reverse=True)]

    def list_admin_orders(self, status, offset, limit):
        if self.role != "ADMIN":
            return [], 0
        rows = sorted((o for o in self.orders.values() if status in (None, o["status"])),
                      key=lambda o: o["createdAt"], reverse=True)
        return [{**{k: o[k] for k in ORDER}, "employerEmail": f"{o['employerId']}@test", "companyName": "Cty"}
                for o in rows[offset:offset + limit]], len(rows)
