import json
from contextlib import contextmanager

import pytest

from app.db import user_tx

SETUP = "select set_config('role', %s, true), set_config('request.jwt.claims', %s, true)"


class FakeConn:
    def __init__(self):
        self.calls: list[tuple[str, tuple | None]] = []
        self.rolled_back = self.pipelined = False

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
        (SETUP, ("authenticated", json.dumps(claims))),
        ("select 1", None),
        ("commit", None),
    ]
    assert pool.conn.pipelined and not pool.conn.rolled_back


def test_anonymous_uses_anon_role():
    pool = FakePool()
    with user_tx(None, pool):
        pass
    assert pool.conn.calls[1] == (SETUP, ("anon", json.dumps({"role": "anon"})))


def test_error_rolls_back():
    pool = FakePool()
    with pytest.raises(RuntimeError), user_tx(None, pool):
        raise RuntimeError
    assert pool.conn.rolled_back and ("commit", None) not in pool.conn.calls
