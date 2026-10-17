import json
from contextlib import contextmanager

import pytest

from app.db import user_tx


class FakeConn:
    def __init__(self):
        self.calls: list[tuple[str, tuple | None]] = []
        self.committed = self.rolled_back = False

    @contextmanager
    def transaction(self):
        try:
            yield
            self.committed = True
        except Exception:
            self.rolled_back = True
            raise

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
        ("set local role authenticated", None),
        ("select set_config('request.jwt.claims', %s, true)", (json.dumps(claims),)),
        ("select 1", None),
    ]
    assert pool.conn.committed


def test_anonymous_uses_anon_role():
    pool = FakePool()
    with user_tx(None, pool):
        pass
    assert pool.conn.calls[0] == ("set local role anon", None)
    assert pool.conn.calls[1][1] == (json.dumps({"role": "anon"}),)


def test_error_rolls_back():
    pool = FakePool()
    with pytest.raises(RuntimeError), user_tx(None, pool):
        raise RuntimeError
    assert pool.conn.rolled_back and not pool.conn.committed
