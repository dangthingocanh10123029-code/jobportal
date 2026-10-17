# ADR-0003: FastAPI là backend nghiệp vụ; Next.js chỉ còn là frontend

**Status:** accepted (2026-10-17)

## Context
v1–v2 đặt nghiệp vụ trong Next.js (Server Actions `src/actions` + domain `src/modules`) gọi thẳng Supabase. Đồ án cần một backend riêng bằng FastAPI.

## Decision
- `backend/` (Python 3.12, FastAPI, psycopg 3, uv) chứa toàn bộ nghiệp vụ: postings, applications, companies, candidates, notifications, dashboard, cập nhật hồ sơ. Mỗi domain: service + repository (Protocol) + InMemory adapter (pytest) + Postgres adapter.
- **Xác thực:** Next.js đọc session Supabase (cookie, `@supabase/ssr`) và gửi `Authorization: Bearer <access_token>` tới FastAPI. FastAPI xác minh JWT bằng JWKS (`/auth/v1/.well-known/jwks.json`, ES256) — không giữ secret.
- **Phân quyền giữ ở database:** mỗi request mở transaction, `set local role authenticated|anon` + `set_config('request.jwt.claims', <claims>, true)`. RLS, RPC (`submit_application`, `change_application_status`, `record_posting_view`), trigger giữ nguyên hiệu lực — FastAPI không tự nới quyền.
- **Storage** (CV, logo, signed URL): FastAPI gọi Supabase Storage REST bằng chính bearer token của người dùng → policy storage giữ nguyên.
- **Auth flows** (đăng ký, đăng nhập, OTP, đăng xuất, auth callback) giữ ở Next.js + Supabase Auth (cần set cookie trình duyệt).
- **Server Actions giữ nguyên chữ ký contract**, chỉ còn là client mỏng gọi REST (`src/lib/api.ts`), nên UI không đổi.
- JSON dùng camelCase giống kiểu TS trong contract; lỗi nghiệp vụ trả `{ "error": "<thông báo tiếng Việt>" }` với HTTP 4xx.

## Consequences
- Hai tiến trình khi dev: `npm run dev` (3000) + `npm run dev:api` (8000).
- `backend/.env` cần `DATABASE_URL` (session pooler) — không commit.
- Domain TS (`src/modules/*`) bị xóa sau khi chuyển xong (ticket 27); hàm thuần UI cần (`allowedNextStatuses`) chuyển sang `src/lib`.
