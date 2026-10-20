from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends

from app.auth import CurrentUser, OptionalUser
from app.modules.messages.domain import MessageError
from app.modules.messages.postgres import PostgresMessageRepository
from app.modules.messages.repository import MessageRepository
from app.modules.messages.schemas import (
    Conversation,
    ConversationPage,
    Message,
    MessageInput,
)
from app.modules.messages.service import MessageService

router = APIRouter(tags=["messages"])


def get_message_repo(actor: OptionalUser) -> MessageRepository:
    return PostgresMessageRepository(actor.claims if actor else None)


def get_message_service(repo: Annotated[MessageRepository, Depends(get_message_repo)]) -> MessageService:
    return MessageService(repo)


Service = Annotated[MessageService, Depends(get_message_service)]


@router.get("/me/conversations", response_model=list[Conversation])
def list_conversations(actor: CurrentUser, service: Service) -> list[Conversation]:
    return service.list_conversations(actor)


@router.get("/me/messages/unread-count", response_model=int)
def unread_message_count(actor: OptionalUser, service: Service) -> int:
    return service.unread_count(actor) if actor else 0


@router.get("/applications/{application_id}/messages", response_model=ConversationPage)
def get_conversation(
    application_id: UUID, actor: CurrentUser, service: Service, before: datetime | None = None
) -> ConversationPage:
    page = service.get_page(actor, application_id, before)
    if page is None:
        raise MessageError("APPLICATION_NOT_FOUND")
    return page


@router.post("/applications/{application_id}/messages", response_model=Message, status_code=201)
def send_message(application_id: UUID, data: MessageInput, actor: CurrentUser, service: Service) -> Message:
    return service.send(actor, application_id, data)


@router.post("/applications/{application_id}/messages/read", response_model=None)
def mark_conversation_read(application_id: UUID, actor: CurrentUser, service: Service) -> None:
    service.mark_read(actor, application_id)
