from datetime import datetime
from typing import Any
from uuid import UUID

from psycopg import errors
from psycopg.rows import dict_row

from app.auth import Actor
from app.db import user_tx
from app.modules.messages.domain import PAGE_SIZE, MessageError
from app.modules.messages.schemas import Conversation, ConversationPage, Message

_CONVERSATION = (
    "select application_id, posting_title, other_party_name, other_party_logo_url, last_message, last_message_at, "
    "unread, can_send from public.conversations"
)
_MESSAGE = "id, application_id, sender_id, sender_id = (select auth.uid()) as mine, body, created_at, read_at"


class PostgresMessageRepository:
    """Runs as the caller (user_tx): messages RLS and the conversations view show only the caller's own
    Applications; writes are RPCs that take the actor from auth.uid(), so `actor` is not sent."""

    def __init__(self, claims: dict[str, Any] | None):
        self._claims = claims

    def _rpc(self, query: str, params: Any) -> list[dict]:
        try:
            with user_tx(self._claims) as conn, conn.cursor(row_factory=dict_row) as cur:
                return cur.execute(query, params).fetchall()
        except errors.RaiseException as exc:
            # RPC errors whose message is a MessageError code are business refusals, not system failures.
            message = exc.diag.message_primary or ""
            if MessageError.is_code(message):
                raise MessageError(message) from exc
            raise

    def list_conversations(self, actor: Actor) -> list[Conversation]:
        # ponytail: newest 100, no paging; add a page param if a busy Employer needs more.
        with user_tx(self._claims) as conn, conn.cursor(row_factory=dict_row) as cur:
            rows = cur.execute(
                f"{_CONVERSATION} where last_message_at is not null or can_send order by sort_at desc limit 100"
            ).fetchall()
        return [Conversation.model_validate(r) for r in rows]

    def get_page(self, actor: Actor, application_id: UUID, before: datetime | None) -> ConversationPage | None:
        with user_tx(self._claims) as conn, conn.cursor(row_factory=dict_row) as cur:
            conversation = cur.execute(f"{_CONVERSATION} where application_id = %s", (application_id,)).fetchone()
            if conversation is None:
                return None
            rows = cur.execute(
                f"select {_MESSAGE} from public.messages where application_id = %s "
                "and (%s::timestamptz is null or created_at < %s) order by created_at desc limit %s",
                (application_id, before, before, PAGE_SIZE + 1),
            ).fetchall()
        return ConversationPage(
            conversation=Conversation.model_validate(conversation),
            messages=[Message.model_validate(r) for r in reversed(rows[:PAGE_SIZE])],
            has_more=len(rows) > PAGE_SIZE,
        )

    def send(self, actor: Actor, application_id: UUID, body: str) -> Message:
        rows = self._rpc(f"select {_MESSAGE} from public.send_message(%s, %s)", (application_id, body))
        return Message.model_validate(rows[0])

    def mark_read(self, actor: Actor, application_id: UUID) -> None:
        self._rpc("select public.mark_conversation_read(%s)", (application_id,))

    def unread_count(self, actor: Actor) -> int:
        with user_tx(self._claims) as conn:
            return conn.execute(
                "select count(*) from public.messages where sender_id <> (select auth.uid()) and read_at is null"
            ).fetchone()[0]
