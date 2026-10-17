"""user_tx against the real DB: the caller's role and claims apply inside, and never leak to the pool's next user.

Run: RUN_INTEGRATION=1 uv run pytest -m integration
"""

import json
import os
from uuid import uuid4

import psycopg
import pytest
from psycopg_pool import ConnectionPool

from app.db import user_tx

DATABASE_URL = os.environ.get("INTEGRATION_DATABASE_URL")
pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(not DATABASE_URL, reason="needs RUN_INTEGRATION=1 and DATABASE_URL"),
]

WHO = "select current_user, current_setting('request.jwt.claims', true), auth.uid()"


@pytest.fixture
def pool():
    # One connection: every user_tx reuses the one the previous caller returned.
    with ConnectionPool(DATABASE_URL, min_size=1, max_size=1) as p:
        yield p


def _left_clean(pool):
    with pool.connection() as conn:
        assert conn.execute(WHO).fetchone()[:2] in [("postgres", ""), ("postgres", None)]


def test_role_and_claims_apply_then_reset(pool):
    user_id = uuid4()
    claims = {"sub": str(user_id), "role": "authenticated"}
    with user_tx(claims, pool) as conn:
        assert conn.execute(WHO).fetchone() == ("authenticated", json.dumps(claims), user_id)
    _left_clean(pool)
    with user_tx(None, pool) as conn:
        assert conn.execute(WHO).fetchone()[0::2] == ("anon", None)
    _left_clean(pool)


def test_failed_query_rolls_back_and_resets(pool):
    with pytest.raises(psycopg.errors.InsufficientPrivilege), user_tx(None, pool) as conn:
        conn.execute("select count(*) from public.profiles").fetchone()  # anon has no grant on profiles
    _left_clean(pool)
