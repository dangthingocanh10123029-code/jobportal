import logging
import time
from dataclasses import dataclass
from functools import lru_cache
from typing import Annotated, Any, Literal

import jwt
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import get_settings
from app.db import user_tx
from app.errors import DomainError

log = logging.getLogger(__name__)

Role = Literal["CANDIDATE", "EMPLOYER", "ADMIN"]


@dataclass(frozen=True)
class Actor:
    user_id: str
    role: Role
    claims: dict[str, Any]
    token: str  # forwarded to Supabase Storage so storage policies apply


class ResilientJwksClient(jwt.PyJWKClient):
    """PyJWKClient that keeps serving the last good key set when a reload fails (a network blip must not reject every token)."""

    _last_good: jwt.PyJWKSet | None = None

    def get_jwk_set(self, refresh: bool = False) -> jwt.PyJWKSet:
        try:
            self._last_good = super().get_jwk_set(refresh)
        except jwt.PyJWKClientConnectionError:
            if self._last_good is None:
                raise
            log.warning("JWKS reload failed; using the last good key set", exc_info=True)
        return self._last_good


@lru_cache
def get_jwks_client() -> jwt.PyJWKClient:
    # Supabase rotates keys rarely; an unknown `kid` forces a reload anyway (after PyJWT's 30 s cooldown).
    return ResilientJwksClient(get_settings().jwks_url, cache_keys=True, lifespan=6 * 3600, timeout=5)


def verify_token(token: str, jwks: jwt.PyJWKClient) -> dict[str, Any]:
    """Supabase access token → claims (ES256 signature via JWKS, aud `authenticated`, exp checked)."""
    try:
        key = jwks.get_signing_key_from_jwt(token).key
        return jwt.decode(
            token, key, algorithms=["ES256"], audience="authenticated", options={"require": ["exp", "sub"]}
        )
    except jwt.PyJWTError as exc:
        raise DomainError(401, "Phiên đăng nhập không hợp lệ hoặc đã hết hạn") from exc


def fetch_account(claims: dict[str, Any]) -> tuple[Role, str | None] | None:
    """(role, locked_reason) of the caller's profile; locked_reason is None unless an Admin locked the account."""
    with user_tx(claims) as conn:
        row = conn.execute(
            "select role, locked_reason from public.profiles where id = %s", (claims["sub"],)
        ).fetchone()
    return (row[0], row[1]) if row else None


# A role never changes (no column grant on profiles.role) but a lock may, so entries live briefly;
# AdminService also drops the entry of the account it locks.
ACCOUNT_TTL_SECONDS = 30
ACCOUNT_CACHE_MAX = 10_000
_accounts: dict[str, tuple[float, tuple[Role, str | None]]] = {}


def cached_account(claims: dict[str, Any]) -> tuple[Role, str | None] | None:
    """fetch_account, remembered for ACCOUNT_TTL_SECONDS. A missing profile is not cached (it may be created next)."""
    now = time.monotonic()
    hit = _accounts.get(claims["sub"])
    if hit and hit[0] > now:
        return hit[1]
    account = fetch_account(claims)
    if account is not None:
        if len(_accounts) >= ACCOUNT_CACHE_MAX:
            _accounts.clear()  # ponytail: drop everything when full; switch to LRU if many active users thrash it
        _accounts[claims["sub"]] = (now + ACCOUNT_TTL_SECONDS, account)
    return account


def forget_account(user_id: str) -> None:
    _accounts.pop(user_id, None)


_bearer = HTTPBearer(auto_error=False)


def authenticate(token: str, jwks: jwt.PyJWKClient) -> Actor:
    """Bearer token → Actor; 401 for a bad token or missing profile, 403 for a locked account."""
    claims = verify_token(token, jwks)
    account = cached_account(claims)
    if account is None:
        raise DomainError(401, "Tài khoản chưa có hồ sơ")
    role, locked_reason = account
    if locked_reason is not None:
        raise DomainError(403, f"Tài khoản đã bị khóa: {locked_reason}")
    return Actor(user_id=claims["sub"], role=role, claims=claims, token=token)


def optional_user(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    jwks: Annotated[jwt.PyJWKClient, Depends(get_jwks_client)],
) -> Actor | None:
    """The caller, or None (guest). A token that fails `authenticate` also means guest: public reads never 401 on it."""
    if creds is None:
        return None
    try:
        return authenticate(creds.credentials, jwks)
    except DomainError as exc:
        log.warning("Bearer token rejected on a public read, serving as guest: %s", exc.message)
        return None


def current_user(
    actor: Annotated[Actor | None, Depends(optional_user)],
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    jwks: Annotated[jwt.PyJWKClient, Depends(get_jwks_client)],
) -> Actor:
    if actor is not None:
        return actor
    if creds is None:
        raise DomainError(401, "Vui lòng đăng nhập")
    # optional_user fell back to guest: re-run to raise the precise 401/403 (locked: contract §32).
    return authenticate(creds.credentials, jwks)


def require_employer(actor: Annotated[Actor, Depends(current_user)]) -> Actor:
    if actor.role != "EMPLOYER":
        raise DomainError(403, "Chỉ nhà tuyển dụng được thực hiện thao tác này")
    return actor


def require_candidate(actor: Annotated[Actor, Depends(current_user)]) -> Actor:
    if actor.role != "CANDIDATE":
        raise DomainError(403, "Chỉ ứng viên được thực hiện thao tác này")
    return actor


def require_admin(actor: Annotated[Actor, Depends(current_user)]) -> Actor:
    if actor.role != "ADMIN":
        raise DomainError(403, "Chỉ quản trị viên được thực hiện thao tác này")
    return actor


# Route parameter types, e.g. `def handler(actor: EmployerActor)`.
OptionalUser = Annotated[Actor | None, Depends(optional_user)]
CurrentUser = Annotated[Actor, Depends(current_user)]
EmployerActor = Annotated[Actor, Depends(require_employer)]
CandidateActor = Annotated[Actor, Depends(require_candidate)]
AdminActor = Annotated[Actor, Depends(require_admin)]
