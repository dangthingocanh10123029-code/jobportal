from dataclasses import dataclass
from functools import lru_cache
from typing import Annotated, Any, Literal

import jwt
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import get_settings
from app.db import user_tx
from app.errors import DomainError

Role = Literal["CANDIDATE", "EMPLOYER"]


@dataclass(frozen=True)
class Actor:
    user_id: str
    role: Role
    claims: dict[str, Any]
    token: str  # forwarded to Supabase Storage so storage policies apply


@lru_cache
def get_jwks_client() -> jwt.PyJWKClient:
    return jwt.PyJWKClient(get_settings().jwks_url, cache_keys=True)


def verify_token(token: str, jwks: jwt.PyJWKClient) -> dict[str, Any]:
    """Supabase access token → claims (ES256 signature via JWKS, aud `authenticated`, exp checked)."""
    try:
        key = jwks.get_signing_key_from_jwt(token).key
        return jwt.decode(
            token, key, algorithms=["ES256"], audience="authenticated", options={"require": ["exp", "sub"]}
        )
    except jwt.PyJWTError as exc:
        raise DomainError(401, "Phiên đăng nhập không hợp lệ hoặc đã hết hạn") from exc


def fetch_role(claims: dict[str, Any]) -> Role | None:
    with user_tx(claims) as conn:
        row = conn.execute("select role from public.profiles where id = %s", (claims["sub"],)).fetchone()
    return row[0] if row else None


_bearer = HTTPBearer(auto_error=False)


def optional_user(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    jwks: Annotated[jwt.PyJWKClient, Depends(get_jwks_client)],
) -> Actor | None:
    if creds is None:
        return None
    claims = verify_token(creds.credentials, jwks)
    role = fetch_role(claims)
    if role is None:
        raise DomainError(401, "Tài khoản chưa có hồ sơ")
    return Actor(user_id=claims["sub"], role=role, claims=claims, token=creds.credentials)


def current_user(actor: Annotated[Actor | None, Depends(optional_user)]) -> Actor:
    if actor is None:
        raise DomainError(401, "Vui lòng đăng nhập")
    return actor


def require_employer(actor: Annotated[Actor, Depends(current_user)]) -> Actor:
    if actor.role != "EMPLOYER":
        raise DomainError(403, "Chỉ nhà tuyển dụng được thực hiện thao tác này")
    return actor


def require_candidate(actor: Annotated[Actor, Depends(current_user)]) -> Actor:
    if actor.role != "CANDIDATE":
        raise DomainError(403, "Chỉ ứng viên được thực hiện thao tác này")
    return actor


# Route parameter types, e.g. `def handler(actor: EmployerActor)`.
OptionalUser = Annotated[Actor | None, Depends(optional_user)]
CurrentUser = Annotated[Actor, Depends(current_user)]
EmployerActor = Annotated[Actor, Depends(require_employer)]
CandidateActor = Annotated[Actor, Depends(require_candidate)]
