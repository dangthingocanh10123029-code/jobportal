# Job Portal

Hệ thống tìm việc online — frontend **Next.js 15**, backend **FastAPI** (Python 3.12), dữ liệu **Supabase** (PostgreSQL, Auth, Storage, RLS). Kiến trúc: `docs/adr/0003-fastapi-backend.md`; API: `docs/api-contract.md` (mục v3) và Swagger tại `http://127.0.0.1:8000/docs`.

```
Trình duyệt → Next.js (giao diện + Server Actions mỏng) → FastAPI (nghiệp vụ) → Supabase Postgres (RLS theo người gọi)
                     └─ Supabase Auth (đăng ký / đăng nhập / OTP)
```

## Chạy local

Cần Node 20+, [uv](https://docs.astral.sh/uv/) và một project Supabase đã áp migration (`supabase db push`).

```bash
npm install
cp .env.example .env.local                 # Supabase URL + anon key, API_URL=http://127.0.0.1:8000
cp backend/.env.example backend/.env       # DATABASE_URL (transaction pooler, cổng 6543), SUPABASE_URL, SUPABASE_ANON_KEY
(cd backend && uv sync)

npm run dev:api                            # FastAPI  → http://127.0.0.1:8000 (Swagger /docs)
npm run dev                                # Next.js  → http://localhost:3000
```

## Kiểm thử

```bash
cd backend && uv run pytest && uv run ruff check   # nghiệp vụ (InMemory)
cd backend && RUN_INTEGRATION=1 uv run pytest -m integration   # mọi query Postgres trên DB thật, tự ROLLBACK
npm test && npm run typecheck                      # Server Actions, apiFetch
```

Kiểm tra trên Supabase thật và E2E: `.scratch/job-portal/manual-checks.md`, `.scratch/job-portal/e2e/`.

## Dữ liệu demo

`supabase/seed/README.md` — 40 công ty hư cấu, ~300 tin, 30 ứng viên; mật khẩu chung `DemoJob!2026`.
