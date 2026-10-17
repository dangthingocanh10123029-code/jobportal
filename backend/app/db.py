import json
from collections.abc import Iterator
from contextlib import contextmanager, suppress
from functools import lru_cache
from typing import Any

import psycopg
from psycopg import Connection
from psycopg_pool import ConnectionPool

from app.config import get_settings

# autocommit: user_tx sends BEGIN/COMMIT itself so they share round trips with the queries.
# Keepalives stop the pooler path from dropping idle connections silently; tcp_user_timeout (Linux) bounds a send
# into a dead socket. The pooler ignores startup `options`, so statement_timeout is set per transaction in user_tx.
CONNECT_KWARGS = {
    "autocommit": True,
    "connect_timeout": 5,
    "keepalives": 1,
    "keepalives_idle": 30,
    "keepalives_interval": 10,
    "keepalives_count": 3,
    "tcp_user_timeout": 10_000,
}
STATEMENT_TIMEOUT = "10s"


@lru_cache
def get_pool() -> ConnectionPool:
    # check: a connection that died while idle is discarded and replaced before any query is sent on it.
    return ConnectionPool(
        get_settings().database_url,
        kwargs=CONNECT_KWARGS,
        min_size=1,
        max_size=10,
        timeout=10,
        check=ConnectionPool.check_connection,
        max_idle=120,
        max_lifetime=1800,
        reconnect_timeout=60,
        open=True,
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
                    "select set_config('role', %s, true), set_config('request.jwt.claims', %s, true), "
                    "set_config('statement_timeout', %s, true)",
                    (role, json.dumps(claims or {"role": "anon"}), STATEMENT_TIMEOUT),
                )
                yield conn
                conn.execute("commit")
        except BaseException:
            # Also ends a transaction whose error surfaced only at the final sync. A lost connection is left
            # broken for the pool to discard, and a failing rollback must not hide the original error.
            if not conn.broken:
                with suppress(psycopg.Error):
                    conn.rollback()
            raise
