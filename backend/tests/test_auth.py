import json
import time

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from app import auth
from app.auth import (
    CurrentUser,
    OptionalUser,
    get_jwks_client,
    require_candidate,
    require_employer,
)
from app.errors import install_error_handlers

KEY = ec.generate_private_key(ec.SECP256R1())
OTHER_KEY = ec.generate_private_key(ec.SECP256R1())


class FakeJwks:
    """Stands in for PyJWKClient: serves the public half of KEY as the only JWKS key."""

    def __init__(self):
        jwk = json.loads(jwt.algorithms.ECAlgorithm.to_jwk(KEY.public_key()))
        self.key = jwt.PyJWK({**jwk, "kid": "k1", "alg": "ES256"})

    def get_signing_key_from_jwt(self, token):
        if jwt.get_unverified_header(token).get("kid") != "k1":
            raise jwt.PyJWKClientError("unknown kid")
        return self.key


def token(sub="u1", key=KEY, kid="k1", **overrides):
    claims = {"sub": sub, "aud": "authenticated", "role": "authenticated", "exp": int(time.time()) + 60, **overrides}
    return jwt.encode(claims, key, algorithm="ES256", headers={"kid": kid})


ROLES = {"emp": "EMPLOYER", "cand": "CANDIDATE"}


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(auth, "fetch_role", lambda claims: ROLES.get(claims["sub"]))
    monkeypatch.setattr(auth, "_roles", {})
    app = FastAPI()
    install_error_handlers(app)
    app.dependency_overrides[get_jwks_client] = FakeJwks

    @app.get("/me")
    def me(actor: CurrentUser):
        return {"userId": actor.user_id, "role": actor.role, "hasToken": bool(actor.token)}

    @app.get("/maybe")
    def maybe(actor: OptionalUser):
        return {"userId": actor.user_id if actor else None}

    @app.get("/emp", dependencies=[Depends(require_employer)])
    def emp():
        return {}

    @app.get("/cand", dependencies=[Depends(require_candidate)])
    def cand():
        return {}

    return TestClient(app)


def bearer(t):
    return {"Authorization": f"Bearer {t}"}


def test_valid_token_yields_actor_with_role_from_profiles(client):
    res = client.get("/me", headers=bearer(token("emp")))
    assert res.status_code == 200
    assert res.json() == {"userId": "emp", "role": "EMPLOYER", "hasToken": True}


def test_missing_token(client):
    assert client.get("/me").json() == {"error": "Vui lòng đăng nhập"}
    assert client.get("/me").status_code == 401
    assert client.get("/maybe").json() == {"userId": None}


@pytest.mark.parametrize(
    "bad",
    [
        token("emp", exp=int(time.time()) - 10),
        token("emp", aud="other"),
        token("emp", key=OTHER_KEY),
        token("emp", kid="unknown"),
        "not-a-jwt",
    ],
    ids=["expired", "wrong-aud", "bad-signature", "unknown-kid", "garbage"],
)
def test_invalid_tokens_are_401(client, bad):
    res = client.get("/maybe", headers=bearer(bad))
    assert res.status_code == 401
    assert res.json() == {"error": "Phiên đăng nhập không hợp lệ hoặc đã hết hạn"}


def test_hs256_token_is_rejected(client):
    forged = jwt.encode({"sub": "emp", "aud": "authenticated", "exp": int(time.time()) + 60}, "secret",
                        algorithm="HS256", headers={"kid": "k1"})
    assert client.get("/me", headers=bearer(forged)).status_code == 401


def test_user_without_profile_is_401(client):
    assert client.get("/me", headers=bearer(token("nobody"))).status_code == 401


def test_role_guards(client):
    assert client.get("/emp", headers=bearer(token("emp"))).status_code == 200
    assert client.get("/cand", headers=bearer(token("cand"))).status_code == 200
    res = client.get("/emp", headers=bearer(token("cand")))
    assert res.status_code == 403 and "error" in res.json()
    assert client.get("/cand", headers=bearer(token("emp"))).status_code == 403


def test_role_is_cached_per_user_but_missing_profile_is_not(monkeypatch):
    calls = []
    roles = {"emp": "EMPLOYER"}
    monkeypatch.setattr(auth, "fetch_role", lambda claims: calls.append(claims["sub"]) or roles.get(claims["sub"]))
    monkeypatch.setattr(auth, "_roles", {})
    assert [auth.cached_role({"sub": "emp"}) for _ in range(2)] == ["EMPLOYER", "EMPLOYER"]
    assert [auth.cached_role({"sub": "new"}) for _ in range(2)] == [None, None]
    assert calls == ["emp", "new", "new"]
    later = time.monotonic() + auth.ROLE_TTL_SECONDS + 1
    monkeypatch.setattr(auth.time, "monotonic", lambda: later)
    auth.cached_role({"sub": "emp"})
    assert calls[-1] == "emp"
