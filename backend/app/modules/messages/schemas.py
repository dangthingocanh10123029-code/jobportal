from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import field_validator

from app.modules.messages.domain import MAX_BODY
from app.schemas import CamelModel


class Message(CamelModel):
    id: UUID
    application_id: UUID
    sender_id: UUID
    mine: bool
    body: str
    created_at: datetime
    read_at: datetime | None


class Conversation(CamelModel):
    application_id: UUID
    posting_title: str
    other_party_name: str
    other_party_logo_url: str | None
    last_message: str | None
    last_message_at: datetime | None
    unread: int
    can_send: bool


class ConversationPage(CamelModel):
    conversation: Conversation
    messages: list[Message]  # oldest first
    has_more: bool


class MessageInput(CamelModel):
    """Body of POST /applications/{id}/messages; same rule and message as sendMessageSchema (Zod) and the table CHECK."""

    body: str

    @field_validator("body", mode="before")
    @classmethod
    def _body(cls, v: Any) -> Any:
        if not isinstance(v, str) or not 1 <= len(v.strip()) <= MAX_BODY:
            raise ValueError("Tin nhắn từ 1 đến 2000 ký tự")
        return v.strip()
