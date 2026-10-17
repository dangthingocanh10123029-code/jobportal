import json
from contextlib import contextmanager

import psycopg
import pytest

from app.db import STATEMENT_TIMEOUT, user_tx

SETUP = (
    "select set_config('role', %s, true), set_config('request.jwt.claims', %s, true), "
    "set_config('statement_timeout', %s, true)"
)


class FakeConn:
    def __init__(self):
        self.calls: list[tuple[str, tuple | None]] = []
        self.rolled_back = self.pipelined = self.broken = False

    @contextmanager
    def pipeline(self):
        self.pipelined = True
        yield

    def rollback(self):
        self.rolled_back = True

    def execute(self, sql, params=None):
        self.calls.append((sql, params))


class FakePool:
    def __init__(self):
        self.conn = FakeConn()

    @contextmanager
    def connection(self):
        yield self.conn


def test_authenticated_sets_role_and_claims_before_user_query():
    pool = FakePool()
    claims = {"sub": "u1", "role": "authenticated"}
    with user_tx(claims, pool) as conn:
        conn.execute("select 1")
    assert pool.conn.calls == [
        ("begin", None),
        (SETUP, ("authenticated", json.dumps(claims), STATEMENT_TIMEOUT)),
        ("select 1", None),
        ("commit", None),
    ]
    assert pool.conn.pipelined and not pool.conn.rolled_back


def test_anonymous_uses_anon_role():
    pool = FakePool()
    with user_tx(None, pool):
        pass
    assert pool.conn.calls[1] == (SETUP, ("anon", json.dumps({"role": "anon"}), STATEMENT_TIMEOUT))


def test_error_rolls_back():
    pool = FakePool()
    with pytest.raises(RuntimeError), user_tx(None, pool):
        raise RuntimeError
    assert pool.conn.rolled_back and ("commit", None) not in pool.conn.calls


def test_lost_connection_is_left_for_the_pool_and_keeps_the_original_error():
    pool = FakePool()
    lost = psycopg.OperationalError("the connection is lost")
    with pytest.raises(psycopg.OperationalError) as err, user_tx(None, pool):
        pool.conn.broken = True
        raise lost
    assert err.value is lost and not pool.conn.rolled_back


def test_failing_rollback_does_not_hide_the_original_error():
    pool = FakePool()

    def rollback():
        raise psycopg.OperationalError("rollback failed")

    pool.conn.rollback = rollback
    with pytest.raises(RuntimeError), user_tx(None, pool):
        raise RuntimeError
