"""Latency of the main read endpoints against the real DB (backend/.env), in-process.

    uv run python -m scripts.bench [-n 20] [--email E --password P]

Read-only: skips GET /postings/{id} (it counts a view). With credentials, signs in through
Supabase's password grant and also times the signed-in endpoints.
"""

import argparse
import statistics
import time

import httpx
from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import app


def sign_in(email: str, password: str) -> str:
    s = get_settings()
    res = httpx.post(
        f"{s.supabase_url.rstrip('/')}/auth/v1/token?grant_type=password",
        headers={"apikey": s.supabase_anon_key},
        json={"email": email, "password": password},
    )
    res.raise_for_status()
    return res.json()["access_token"]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("-n", type=int, default=20)
    parser.add_argument("--email")
    parser.add_argument("--password")
    args = parser.parse_args()

    with TestClient(app) as client:
        posting_id = client.get("/postings").json()["items"][0]["id"]
        anon = ["/health", "/postings", "/postings?q=java&page=2", f"/postings/{posting_id}/related", "/companies"]
        runs = [(path, {}) for path in anon]
        if args.email:
            auth = {"Authorization": f"Bearer {sign_in(args.email, args.password)}"}
            role = client.get("/me/profile", headers=auth).json()["role"]
            mine = ["/me/profile", "/me/notifications/unread-count", "/me/notifications"]
            mine += (
                ["/me/applications", "/me/saved-postings/ids", "/me/candidate-profile"]
                if role == "CANDIDATE"
                else ["/me/postings", "/me/dashboard", "/me/company"]
            )
            runs += [(path, auth) for path in mine]

        print(f"{'endpoint':45} {'p50 ms':>8} {'p95 ms':>8}")
        for path, headers in runs:
            client.get(path, headers=headers).raise_for_status()  # warm-up: pool connection, JWKS
            times = []
            for _ in range(args.n):
                start = time.perf_counter()
                client.get(path, headers=headers).raise_for_status()
                times.append((time.perf_counter() - start) * 1000)
            p95 = statistics.quantiles(times, n=20)[-1]
            print(f"{('🔒 ' if headers else '') + path:45} {statistics.median(times):8.0f} {p95:8.0f}")


if __name__ == "__main__":
    main()
