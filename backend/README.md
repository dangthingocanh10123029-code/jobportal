# Job Portal API (FastAPI)

Backend nghiệp vụ theo `docs/adr/0003-fastapi-backend.md`; endpoint ở `docs/api-contract.md` mục v3.

## Chạy

```sh
cp backend/.env.example backend/.env   # điền DATABASE_URL (session pooler), SUPABASE_URL — không commit
cd backend && uv sync
npm run dev:api                        # từ thư mục gốc: http://127.0.0.1:8000, Swagger ở /docs
curl http://127.0.0.1:8000/health      # {"status":"ok","db":true,"jwks":true}; 503 nếu DB/JWKS lỗi
```

Next.js gọi API qua `src/lib/api.ts` (`apiFetch`, base `API_URL` trong `.env.local`).

## Test

```sh
cd backend && uv run pytest && uv run ruff check
```

Test không chạm DB/JWKS thật: auth dùng khóa EC sinh trong test + JWKS giả, `user_tx` dùng pool giả, `/health` override repository bằng bản in-memory.

## Cấu trúc

- `app/main.py` — FastAPI, CORS (`ALLOWED_ORIGINS`), handler lỗi, router.
- `app/db.py` — pool psycopg; `user_tx(claims)` mở transaction với `set local role authenticated|anon` + `request.jwt.claims` → RLS/RPC của Supabase giữ hiệu lực. Mọi truy vấn người dùng đi qua `user_tx`.
- `app/auth.py` — xác minh Bearer (ES256, JWKS, aud `authenticated`); kiểu tham số route `CurrentUser`, `OptionalUser`, `EmployerActor`, `CandidateActor`.
- `app/errors.py` — `DomainError(status, message)` → `{ "error": message }`; lỗi 422 → câu tiếng Việt đầu tiên.
- `app/schemas.py` — `CamelModel` (JSON camelCase).
- `app/modules/<domain>/` — `domain.py`, `repository.py` (Protocol), `memory.py` (test), `postgres.py`, `service.py`, `router.py`. Mẫu: `modules/health`.
