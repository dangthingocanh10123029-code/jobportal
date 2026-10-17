from app.db import user_tx
from app.modules.dashboard.domain import PostingStats


class PostgresDashboardRepository:
    def __init__(self, claims):
        self.claims = claims

    def posting_stats(self, employer_id: str):
        with user_tx(self.claims) as conn:
            rows = conn.execute(
                """select id,title,status,application_deadline,views,applications_by_status
                   from public.employer_posting_stats where employer_id=%s order by created_at desc""",
                (employer_id,),
            ).fetchall()
        return [
            PostingStats(
                str(row[0]), row[1], row[2], row[3].isoformat(), row[4], row[5] or {}
            )
            for row in rows
        ]
