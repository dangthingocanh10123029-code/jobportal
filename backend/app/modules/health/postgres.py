import jwt
import psycopg

from app.auth import get_jwks_client
from app.db import get_pool


class PostgresHealthRepository:
    def ping_db(self) -> bool:
        try:
            # Short pool timeout: /health must answer 503 within ~3 s when the DB is unreachable.
            with get_pool().connection(timeout=2) as conn:
                return conn.execute("select 1").fetchone() == (1,)
        except psycopg.Error:
            return False

    def ping_jwks(self) -> bool:
        try:
            return bool(get_jwks_client().get_signing_keys())
        except jwt.PyJWKClientError:
            return False
