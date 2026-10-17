import os

from pydantic import ValidationError

from app.config import Settings

# Integration tests (tests/integration) need the real DATABASE_URL (env or backend/.env), read before the fake below.
if os.environ.get("RUN_INTEGRATION"):
    try:
        os.environ.setdefault("INTEGRATION_DATABASE_URL", Settings().database_url)
    except ValidationError:
        pass

# Settings are required at import time (CORS); unit tests never touch the real DB or JWKS.
os.environ.setdefault("DATABASE_URL", "postgresql://test@localhost/test")
os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
