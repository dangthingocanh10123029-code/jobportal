from __future__ import annotations

import uuid

from app.errors import DomainError
from app.modules.notifications.repository import NotificationRepository

LIST_LIMIT = 30


class NotificationService:
    def __init__(self, repo: NotificationRepository):
        self.repo = repo

    def list(self, recipient_id: str):
        return self.repo.recent(recipient_id, LIST_LIMIT)

    def unread_count(self, recipient_id: str):
        return self.repo.unread_count(recipient_id)

    def mark_read(self, recipient_id: str, ids: list[str] | None):
        if ids is not None:
            if len(ids) > 100:
                raise DomainError(422, "Tối đa 100 thông báo mỗi lần")
            if any(not is_uuid(value) for value in ids):
                raise DomainError(422, "Mã thông báo không hợp lệ")
        self.repo.mark_read(recipient_id, ids if ids else None)


def is_uuid(value: str) -> bool:
    try:
        uuid.UUID(value)
        return True
    except (ValueError, AttributeError):
        return False
