from dataclasses import dataclass, field
from datetime import UTC, datetime

from app.modules.notifications.domain import AppNotification


@dataclass
class InMemoryNotificationRepository:
    notifications: list[tuple[str, AppNotification]] = field(default_factory=list)
    now: datetime = field(default_factory=lambda: datetime.now(UTC))

    def recent(self, recipient_id: str, limit: int) -> list[AppNotification]:
        rows = [item for owner, item in self.notifications if owner == recipient_id]
        return sorted(rows, key=lambda item: item.created_at, reverse=True)[:limit]

    def unread_count(self, recipient_id: str) -> int:
        return sum(
            item.read_at is None
            for owner, item in self.notifications
            if owner == recipient_id
        )

    def mark_read(self, recipient_id: str, ids: list[str] | None) -> None:
        selected = set(ids) if ids is not None else None
        updated = []
        for owner, item in self.notifications:
            if owner == recipient_id and item.read_at is None and (
                selected is None or item.id in selected
            ):
                item = AppNotification(
                    item.id,
                    item.type,
                    item.title,
                    item.body,
                    item.link,
                    self.now.isoformat(),
                    item.created_at,
                )
            updated.append((owner, item))
        self.notifications = updated
