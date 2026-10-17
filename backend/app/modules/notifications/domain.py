from dataclasses import dataclass
from typing import Literal

NotificationType = Literal[
    "APPLICATION_RECEIVED", "APPLICATION_STATUS_CHANGED", "APPLICATION_WITHDRAWN"
]


@dataclass(frozen=True)
class AppNotification:
    id: str
    type: NotificationType
    title: str
    body: str
    link: str
    read_at: str | None
    created_at: str

    def json(self) -> dict:
        return {
            "id": self.id,
            "type": self.type,
            "title": self.title,
            "body": self.body,
            "link": self.link,
            "readAt": self.read_at,
            "createdAt": self.created_at,
        }
