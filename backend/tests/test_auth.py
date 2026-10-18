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
    require_admin,
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


ACCOUNTS = {
    "emp": ("EMPLOYER", None),
    "cand": ("CANDIDATE", None),
    "adm": ("ADMIN", None),
    "locked": ("CANDIDATE", "Spam tin nhắn"),
}


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(auth, "fetch_account", lambda claims: ACCOUNTS.get(claims["sub"]))
    monkeypatch.setattr(auth, "_accounts", {})
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

    @app.get("/adm", dependencies=[Depends(require_admin)])
    def adm():
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
        token("emp", exp=int(time.time()) - 60),
        token("emp", iat=int(time.time()) + 120),
        token("emp", aud="other"),
        token("emp", key=OTHER_KEY),
        token("emp", kid="unknown"),
        "not-a-jwt",
    ],
    ids=["expired", "issued-in-future", "wrong-aud", "bad-signature", "unknown-kid", "garbage"],
)
def test_invalid_tokens_are_401_but_guest_on_public_reads(client, bad):
    res = client.get("/me", headers=bearer(bad))
    assert res.status_code == 401
    assert res.json() == {"error": "Phiên đăng nhập không hợp lệ hoặc đã hết hạn"}
    res = client.get("/maybe", headers=bearer(bad))
    assert res.status_code == 200 and res.json() == {"userId": None}


def test_small_clock_skew_is_tolerated(client):
    assert client.get("/me", headers=bearer(token("emp", iat=int(time.time()) + 5))).status_code == 200


def test_hs256_token_is_rejected(client):
    forged = jwt.encode({"sub": "emp", "aud": "authenticated", "exp": int(time.time()) + 60}, "secret",
                        algorithm="HS256", headers={"kid": "k1"})
    assert client.get("/me", headers=bearer(forged)).status_code == 401


def test_user_without_profile_is_401(client):
    assert client.get("/me", headers=bearer(token("nobody"))).status_code == 401
    assert client.get("/maybe", headers=bearer(token("nobody"))).json() == {"userId": None}


def test_role_guards(client):
    assert client.get("/emp", headers=bearer(token("emp"))).status_code == 200
    assert client.get("/cand", headers=bearer(token("cand"))).status_code == 200
    res = client.get("/emp", headers=bearer(token("cand")))
    assert res.status_code == 403 and "error" in res.json()
    assert client.get("/cand", headers=bearer(token("emp"))).status_code == 403
    assert client.get("/adm", headers=bearer(token("adm"))).status_code == 200
    for other in ("emp", "cand"):
        res = client.get("/adm", headers=bearer(token(other)))
        assert res.status_code == 403 and res.json() == {"error": "Chỉ quản trị viên được thực hiện thao tác này"}


def test_locked_account_is_403_with_reason_but_guest_on_public_reads(client):
    for path in ("/me", "/cand"):
        res = client.get(path, headers=bearer(token("locked")))
        assert res.status_code == 403 and res.json() == {"error": "Tài khoản đã bị khóa: Spam tin nhắn"}
    res = client.get("/maybe", headers=bearer(token("locked")))
    assert res.status_code == 200 and res.json() == {"userId": None}


def test_jwks_reload_failure_keeps_last_good_keys(monkeypatch):
    jwk = {**json.loads(jwt.algorithms.ECAlgorithm.to_jwk(KEY.public_key())), "kid": "k1", "alg": "ES256"}
    responses = [{"keys": [jwk]}]

    def fetch_data(self):
        if not responses:
            raise jwt.PyJWKClientConnectionError("network down")
        return responses.pop()

    monkeypatch.setattr(auth.ResilientJwksClient, "fetch_data", fetch_data)
    jwks = auth.ResilientJwksClient("https://example.test/jwks.json", lifespan=60)
    assert auth.verify_token(token("emp"), jwks)["sub"] == "emp"
    later = time.monotonic() + 120  # cached set expired, reload fails
    monkeypatch.setattr(time, "monotonic", lambda: later)
    assert auth.verify_token(token("emp"), jwks)["sub"] == "emp"
    with pytest.raises(auth.DomainError):
        auth.verify_token(token("emp", kid="k2"), jwks)  # unknown kid: forced reload fails, still 401


def test_jwks_failure_without_any_keys_is_401(monkeypatch):
    def fetch_data(self):
        raise jwt.PyJWKClientConnectionError("network down")

    monkeypatch.setattr(auth.ResilientJwksClient, "fetch_data", fetch_data)
    with pytest.raises(auth.DomainError):
        auth.verify_token(token("emp"), auth.ResilientJwksClient("https://example.test/jwks.json"))


def test_account_is_cached_briefly_and_forgotten_on_lock(monkeypatch):
    calls = []
    accounts = {"emp": ("EMPLOYER", None)}
    monkeypatch.setattr(auth, "fetch_account", lambda claims: calls.append(claims["sub"]) or accounts.get(claims["sub"]))
    monkeypatch.setattr(auth, "_accounts", {})
    assert [auth.cached_account({"sub": "emp"}) for _ in range(2)] == [("EMPLOYER", None)] * 2
    assert [auth.cached_account({"sub": "new"}) for _ in range(2)] == [None, None]
    assert calls == ["emp", "new", "new"]
    accounts["emp"] = ("EMPLOYER", "Vi phạm")
    auth.forget_account("emp")
    assert auth.cached_account({"sub": "emp"}) == ("EMPLOYER", "Vi phạm")
    later = time.monotonic() + auth.ACCOUNT_TTL_SECONDS + 1
    monkeypatch.setattr(auth.time, "monotonic", lambda: later)
    auth.cached_account({"sub": "emp"})
    assert calls[-1] == "emp" and len(calls) == 5
