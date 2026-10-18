from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=Path(__file__).resolve().parent.parent / ".env", extra="ignore")

    database_url: str
    db_pool_max_size: int = 10
    supabase_url: str
    supabase_anon_key: str = ""
    allowed_origins: str = "http://localhost:3000"

    @property
    def origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    @property
    def jwks_url(self) -> str:
        return f"{self.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"


@lru_cache
def get_settings() -> Settings:
    return Settings()
