from datetime import datetime
from uuid import UUID

from app.auth import Actor
from app.modules.messages.repository import MessageRepository
from app.modules.messages.schemas import (
    Conversation,
    ConversationPage,
    Message,
    MessageInput,
)


class MessageService:
    """Chat per Application between its Candidate and the posting's Employer.
    Inputs arrive validated (schemas); the database (RPC + RLS) has the final say on who, when and how often."""

    def __init__(self, repo: MessageRepository):
        self._repo = repo

    def list_conversations(self, actor: Actor) -> list[Conversation]:
        return self._repo.list_conversations(actor)

    def get_page(self, actor: Actor, application_id: UUID, before: datetime | None) -> ConversationPage | None:
        return self._repo.get_page(actor, application_id, before)

    def send(self, actor: Actor, application_id: UUID, data: MessageInput) -> Message:
        return self._repo.send(actor, application_id, data.body)

    def mark_read(self, actor: Actor, application_id: UUID) -> None:
        self._repo.mark_read(actor, application_id)

    def unread_count(self, actor: Actor) -> int:
        return self._repo.unread_count(actor)
