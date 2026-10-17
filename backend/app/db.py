import json
from collections.abc import Iterator
from contextlib import contextmanager
from functools import lru_cache
from typing import Any

from psycopg import Connection
from psycopg_pool import ConnectionPool

from app.config import get_settings


@lru_cache
def get_pool() -> ConnectionPool:
    return ConnectionPool(get_settings().database_url, min_size=1, max_size=10, timeout=10, open=True)


def close_pool() -> None:
    if get_pool.cache_info().currsize:
        get_pool().close()
        get_pool.cache_clear()


@contextmanager
def user_tx(claims: dict[str, Any] | None, pool: ConnectionPool | None = None) -> Iterator[Connection]:
    """Transaction running as the caller (RLS applies): role authenticated with JWT claims, or anon.

    The pool logs in as postgres; `set local role` drops to the caller's role before any user query.
    """
    role = "authenticated" if claims else "anon"
    with (pool or get_pool()).connection() as conn, conn.transaction():
        conn.execute(f"set local role {role}")  # role is one of two literals, never user input
        conn.execute(
            "select set_config('request.jwt.claims', %s, true)",
            (json.dumps(claims or {"role": "anon"}),),
        )
        yield conn
