# 22: Nền tảng backend FastAPI

**What to build:** Skeleton FastAPI theo ADR-0003: cấu hình, pool Postgres có RLS theo người gọi, xác thực JWT Supabase, định dạng lỗi, `/health`, Swagger; phía Next có `apiFetch`. Chưa chuyển domain nào.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [ ] `backend/app/main.py` (FastAPI, `/docs`, CORS từ `ALLOWED_ORIGINS`), `app/config.py` (pydantic-settings đọc `backend/.env`)
- [ ] `app/db.py`: `psycopg_pool.ConnectionPool` (session pooler) + context manager `user_tx(claims | None)` mở transaction, `set local role authenticated|anon`, `select set_config('request.jwt.claims', <json>, true)`; không bao giờ chạy truy vấn người dùng với quyền postgres
- [ ] `app/auth.py`: dependency `current_user` / `optional_user` xác minh Bearer bằng `jwt.PyJWKClient(<SUPABASE_URL>/auth/v1/.well-known/jwks.json)` (ES256, aud `authenticated`, kiểm tra exp), trả `Actor(user_id, role, claims, token)`; role lấy từ `profiles` qua `user_tx`. Dependency `require_employer` / `require_candidate` → 403
- [ ] `app/errors.py`: `DomainError(status, message)` → `{ "error": message }`; 422 của FastAPI đổi về `{ error: <thông báo đầu tiên tiếng Việt> }`
- [ ] Cấu trúc module mẫu `app/modules/<domain>/{domain.py, repository.py (Protocol), memory.py, postgres.py, service.py, router.py}` + `app/schemas.py` (Pydantic, alias camelCase); `GET /health` kiểm tra DB (select 1 dưới role anon) + JWKS
- [ ] pytest: test auth (token giả ký bằng khóa EC tạo trong test + JWKS giả), `user_tx` set đúng role/claims (test với fake connection), `/health` bằng TestClient với dependency override
- [ ] Phía Next: `src/lib/api.ts` `apiFetch<T>(path, { method, body, formData, auth })` đọc access_token bằng `createSupabaseServerClient().auth.getSession()` (đã xác minh bởi middleware), base `process.env.API_URL`; lỗi HTTP → `{ ok:false, status, error }`; test với fetch mock
- [ ] `package.json` script `dev:api` = `cd backend && uv run uvicorn app.main:app --reload --port 8000` (Coordinator duyệt); `backend/README.md` chạy + test
- [ ] Coordinator: chạy thật với Supabase, `curl /health`
- [ ] `cd backend && uv run pytest && uv run ruff check` xanh; `npm test` + `npm run typecheck` xanh

## Phân công (Orca)

ADR: `docs/adr/0003-fastapi-backend.md`. Contract: `docs/api-contract.md` mục v3.

- **Claude logic:** toàn bộ ticket.
