import jwt
import psycopg

from app.auth import get_jwks_client
from app.db import user_tx


class PostgresHealthRepository:
    def ping_db(self) -> bool:
        try:
            with user_tx(None) as conn:
                return conn.execute("select 1").fetchone() == (1,)
        except psycopg.Error:
            return False

    def ping_jwks(self) -> bool:
        try:
            return bool(get_jwks_client().get_signing_keys())
        except jwt.PyJWKClientError:
            return False
