from datetime import datetime
from typing import Protocol
from uuid import UUID

from app.auth import Actor
from app.modules.messages.schemas import Conversation, ConversationPage, Message


class MessageRepository(Protocol):
    """Writes are RPCs that take the actor from auth.uid(); someone else's Application looks missing (404)."""

    def list_conversations(self, actor: Actor) -> list[Conversation]:
        """Applications with ≥ 1 message or still open (can_send); latest activity first."""
        ...
    def get_page(self, actor: Actor, application_id: UUID, before: datetime | None) -> ConversationPage | None:
        """PAGE_SIZE messages older than `before`, oldest first; None unless `actor` is a side of the Application."""
        ...
    def send(self, actor: Actor, application_id: UUID, body: str) -> Message:
        """CONVERSATION_CLOSED once WITHDRAWN/REJECTED/HIRED; MESSAGE_RATE_LIMITED past RATE_LIMIT per minute."""
        ...
    def mark_read(self, actor: Actor, application_id: UUID) -> None:
        """Marks the other side's messages read."""
        ...
    def unread_count(self, actor: Actor) -> int:
        ...
