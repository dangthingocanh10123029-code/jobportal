"""Ticket 35: a pool connection killed server-side is replaced, not handed out dead.

Only the backend of the test pool's own connection is terminated (its pid read through that connection).
Run: RUN_INTEGRATION=1 uv run pytest -m integration
"""

import os

import psycopg
import pytest
from fastapi.testclient import TestClient
from psycopg_pool import ConnectionPool

from app.db import CONNECT_KWARGS, STATEMENT_TIMEOUT, user_tx
from app.main import app

DATABASE_URL = os.environ.get("INTEGRATION_DATABASE_URL")
pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(not DATABASE_URL, reason="needs RUN_INTEGRATION=1 and DATABASE_URL"),
]


@pytest.fixture
def pool():
    # One connection, same settings as get_pool: the next request must get the replacement.
    with ConnectionPool(DATABASE_URL, kwargs=CONNECT_KWARGS, min_size=1, max_size=1, timeout=10,
                        check=ConnectionPool.check_connection) as p:
        yield p


def _pid(pool) -> int:
    with user_tx(None, pool) as conn:
        return conn.execute("select pg_backend_pid()").fetchone()[0]


def _kill(pid: int) -> None:
    with psycopg.connect(DATABASE_URL, autocommit=True) as admin:
        assert admin.execute("select pg_terminate_backend(%s)", (pid,)).fetchone() == (True,)


def test_killed_connection_is_replaced(pool):
    pid = _pid(pool)
    _kill(pid)
    assert _pid(pool) != pid


def test_endpoint_answers_after_its_connection_is_killed(pool, monkeypatch):
    monkeypatch.setattr("app.db.get_pool", lambda: pool)
    monkeypatch.setattr("app.modules.health.postgres.get_pool", lambda: pool)
    client = TestClient(app)
    _kill(_pid(pool))
    assert client.get("/health").json()["db"] is True  # PostgresHealthRepository.ping_db against the real DB
    assert client.get("/postings").status_code == 200


def test_statement_timeout_is_set_per_transaction(pool):
    with user_tx(None, pool) as conn:
        assert conn.execute("show statement_timeout").fetchone() == (STATEMENT_TIMEOUT,)
