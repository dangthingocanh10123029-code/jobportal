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
    # autocommit: user_tx sends BEGIN/COMMIT itself so they share round trips with the queries.
    return ConnectionPool(
        get_settings().database_url, kwargs={"autocommit": True}, min_size=1, max_size=10, timeout=10, open=True
    )


def close_pool() -> None:
    if get_pool.cache_info().currsize:
        get_pool().close()
        get_pool.cache_clear()


@contextmanager
def user_tx(claims: dict[str, Any] | None, pool: ConnectionPool | None = None) -> Iterator[Connection]:
    """Transaction running as the caller (RLS applies): role authenticated with JWT claims, or anon.

    The pool logs in as postgres; `set_config('role', …, true)` (= set local role) drops to the caller's role
    before any user query. Pipeline mode on an autocommit connection: BEGIN, the setup and the first query
    go in one round trip, COMMIT in a second (psycopg's conn.transaction() would add three more syncs).
    """
    role = "authenticated" if claims else "anon"
    with (pool or get_pool()).connection() as conn:
        try:
            with conn.pipeline():
                conn.execute("begin")
                conn.execute(
                    "select set_config('role', %s, true), set_config('request.jwt.claims', %s, true)",
                    (role, json.dumps(claims or {"role": "anon"})),
                )
                yield conn
                conn.execute("commit")
        except BaseException:
            conn.rollback()  # also ends a transaction whose error surfaced only at the final sync
            raise
