from app.db import user_tx
from app.modules.notifications.domain import AppNotification


def notification(row):
    return AppNotification(
        str(row[0]),
        row[1],
        row[2],
        row[3],
        row[4],
        row[5].isoformat() if row[5] else None,
        row[6].isoformat(),
    )


class PostgresNotificationRepository:
    def __init__(self, claims):
        self.claims = claims

    def recent(self, recipient_id: str, limit: int):
        with user_tx(self.claims) as conn:
            rows = conn.execute(
                """select id,type,title,body,link,read_at,created_at
                   from public.notifications where recipient_id=%s
                   order by created_at desc limit %s""",
                (recipient_id, limit),
            ).fetchall()
        return [notification(row) for row in rows]

    def unread_count(self, recipient_id: str):
        with user_tx(self.claims) as conn:
            row = conn.execute(
                "select count(*) from public.notifications where recipient_id=%s and read_at is null",
                (recipient_id,),
            ).fetchone()
        return row[0]

    def mark_read(self, recipient_id: str, ids: list[str] | None):
        with user_tx(self.claims) as conn:
            if ids:
                conn.execute(
                    """update public.notifications set read_at=now()
                       where recipient_id=%s and id=any(%s::uuid[]) and read_at is null""",
                    (recipient_id, ids),
                )
            else:
                conn.execute(
                    """update public.notifications set read_at=now()
                       where recipient_id=%s and read_at is null""",
                    (recipient_id,),
                )
