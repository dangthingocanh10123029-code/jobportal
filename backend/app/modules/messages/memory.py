from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from app.auth import Actor
from app.modules.messages.domain import CLOSED, PAGE_SIZE, RATE_LIMIT, MessageError
from app.modules.messages.schemas import Conversation, ConversationPage, Message


class InMemoryMessageRepository:
    """Enforces what the RPCs and the conversations view enforce, for pytest.
    `applications`: id → (candidate_id, employer_id, application status)."""

    def __init__(self, applications: dict[UUID, tuple[UUID, UUID, str]] | None = None):
        self.applications = applications or {}
        self.rows: list[Message] = []

    def _side(self, actor: Actor, application_id: UUID) -> bool:
        app = self.applications.get(application_id)
        return app is not None and UUID(actor.user_id) in app[:2]

    def _as(self, actor: Actor, message: Message) -> Message:
        return message.model_copy(update={"mine": str(message.sender_id) == actor.user_id})

    def _messages(self, actor: Actor, application_id: UUID) -> list[Message]:
        return [self._as(actor, m) for m in self.rows if m.application_id == application_id]

    def _conversation(self, actor: Actor, application_id: UUID) -> Conversation:
        candidate, _, status = self.applications[application_id]
        messages = self._messages(actor, application_id)
        last = messages[-1] if messages else None
        is_candidate = UUID(actor.user_id) == candidate
        return Conversation(
            application_id=application_id, posting_title="Kế toán",
            other_party_name="ACME" if is_candidate else "Ứng viên", other_party_logo_url=None,
            last_message=last.body if last else None, last_message_at=last.created_at if last else None,
            unread=sum(1 for m in messages if not m.mine and m.read_at is None), can_send=status not in CLOSED,
        )

    def list_conversations(self, actor: Actor) -> list[Conversation]:
        rows = [self._conversation(actor, a) for a in self.applications if self._side(actor, a)]
        rows = [c for c in rows if c.last_message_at or c.can_send]
        return sorted(rows, key=lambda c: c.last_message_at or datetime.min.replace(tzinfo=UTC), reverse=True)

    def get_page(self, actor: Actor, application_id: UUID, before: datetime | None) -> ConversationPage | None:
        if not self._side(actor, application_id):
            return None
        older = [m for m in self._messages(actor, application_id) if before is None or m.created_at < before]
        return ConversationPage(conversation=self._conversation(actor, application_id),
                                messages=older[-PAGE_SIZE:], has_more=len(older) > PAGE_SIZE)

    def send(self, actor: Actor, application_id: UUID, body: str) -> Message:
        if not self._side(actor, application_id):
            raise MessageError("APPLICATION_NOT_FOUND")
        if self.applications[application_id][2] in CLOSED:
            raise MessageError("CONVERSATION_CLOSED")
        now = datetime.now(UTC)
        sender = UUID(actor.user_id)
        if sum(1 for m in self.rows if m.sender_id == sender and m.created_at > now - timedelta(minutes=1)) >= RATE_LIMIT:
            raise MessageError("MESSAGE_RATE_LIMITED")
        message = Message(id=uuid4(), application_id=application_id, sender_id=sender, mine=True, body=body,
                          created_at=now, read_at=None)
        self.rows.append(message)
        return message

    def mark_read(self, actor: Actor, application_id: UUID) -> None:
        if not self._side(actor, application_id):
            raise MessageError("APPLICATION_NOT_FOUND")
        now = datetime.now(UTC)
        self.rows = [
            m.model_copy(update={"read_at": now})
            if m.application_id == application_id and str(m.sender_id) != actor.user_id and m.read_at is None else m
            for m in self.rows
        ]

    def unread_count(self, actor: Actor) -> int:
        return sum(1 for m in self.rows
                   if self._side(actor, m.application_id) and str(m.sender_id) != actor.user_id and m.read_at is None)
