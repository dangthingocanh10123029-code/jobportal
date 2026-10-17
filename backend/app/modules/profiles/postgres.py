from app.db import user_tx
from app.modules.profiles.domain import Profile

COLS = "id,role,full_name,phone,company_name"


def profile(row):
    return Profile(str(row[0]), row[1], row[2], row[3], row[4])


class PostgresProfileRepository:
    def __init__(self, claims):
        self.claims = claims

    def get(self, user_id: str):
        with user_tx(self.claims) as conn:
            row = conn.execute(
                f"select {COLS} from public.profiles where id=%s", (user_id,)
            ).fetchone()
        return profile(row) if row else None

    def update(self, user_id: str, changes: dict):
        if not changes:
            return self.get(user_id)
        keys = list(changes)
        with user_tx(self.claims) as conn:
            row = conn.execute(
                f"update public.profiles set {','.join(k + '=%s' for k in keys)} where id=%s returning {COLS}",
                (*[changes[k] for k in keys], user_id),
            ).fetchone()
        return profile(row) if row else None
