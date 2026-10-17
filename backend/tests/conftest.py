import os

# Settings are required at import time (CORS); tests never touch the real DB or JWKS.
os.environ.setdefault("DATABASE_URL", "postgresql://test@localhost/test")
os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
