from typing import Protocol

import httpx

from app.config import get_settings
from app.errors import DomainError

BUCKET = "resumes"


class ResumeStorage(Protocol):
    def upload(self, path: str, content: bytes) -> None: ...
    def remove(self, path: str) -> None: ...
    def signed_url(self, path: str, expires_in: int) -> str: ...


class SupabaseResumeStorage:
    """Storage REST as the caller (their Bearer token), so the resumes bucket policies apply — no service key."""

    def __init__(self, token: str):
        settings = get_settings()
        self._base = f"{settings.supabase_url.rstrip('/')}/storage/v1"
        self._headers = {"apikey": settings.supabase_anon_key, "Authorization": f"Bearer {token}"}

    def _request(self, method: str, path: str, error: str, **kwargs) -> httpx.Response:
        try:
            with httpx.Client(timeout=20) as client:
                res = client.request(method, f"{self._base}{path}", headers=self._headers | kwargs.pop("headers", {}), **kwargs)
            res.raise_for_status()
            return res
        except httpx.HTTPError as exc:
            raise DomainError(502, error) from exc

    def upload(self, path: str, content: bytes) -> None:
        self._request(
            "POST", f"/object/{BUCKET}/{path}", "Không tải được CV lên, vui lòng thử lại",
            content=content, headers={"Content-Type": "application/pdf", "x-upsert": "false"},
        )

    def remove(self, path: str) -> None:
        self._request("DELETE", f"/object/{BUCKET}/{path}", "Không xóa được CV")

    def signed_url(self, path: str, expires_in: int) -> str:
        error = "Không tạo được link tải CV, vui lòng thử lại"
        res = self._request("POST", f"/object/sign/{BUCKET}/{path}", error, json={"expiresIn": expires_in})
        signed = res.json().get("signedURL")
        if not isinstance(signed, str):
            raise DomainError(502, error)
        return f"{self._base}{signed}"
