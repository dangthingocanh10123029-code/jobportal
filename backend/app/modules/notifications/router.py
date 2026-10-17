from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict

from app.auth import CurrentUser, OptionalUser
from app.modules.notifications.postgres import PostgresNotificationRepository
from app.modules.notifications.repository import NotificationRepository
from app.modules.notifications.service import NotificationService

router = APIRouter(tags=["notifications"])


class MarkReadBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    ids: list[str] | None = None


def get_notification_repo(actor: OptionalUser) -> NotificationRepository:
    return PostgresNotificationRepository(actor.claims if actor else None)


@router.get("/me/notifications")
def list_notifications(
    actor: CurrentUser,
    repo: Annotated[NotificationRepository, Depends(get_notification_repo)],
):
    return [item.json() for item in NotificationService(repo).list(actor.user_id)]


@router.get("/me/notifications/unread-count")
def unread_count(
    actor: OptionalUser,
    repo: Annotated[NotificationRepository, Depends(get_notification_repo)],
):
    return NotificationService(repo).unread_count(actor.user_id) if actor else 0


@router.post("/me/notifications/read")
def mark_read(
    body: MarkReadBody,
    actor: CurrentUser,
    repo: Annotated[NotificationRepository, Depends(get_notification_repo)],
):
    NotificationService(repo).mark_read(actor.user_id, body.ids)
    return {"success": True, "data": None}
