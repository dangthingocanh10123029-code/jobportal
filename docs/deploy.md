# Deploy — Vercel Services (Next.js + FastAPI) + Supabase (Singapore)

Production: **https://jobportal-sigma-five.vercel.app** (project Vercel `nguyen-van/jobportal`).

Một project Vercel chứa cả hai service (`vercel.json`), cùng Supabase ở Singapore:

```
Trình duyệt → Vercel service "web" (Next.js, sin1) ──binding API_URL──▶ service "api" (FastAPI, nội bộ) → Supabase (ap-southeast-1, transaction pooler 6543)
```

- Chỉ service `web` có rewrite công khai. Service `api` **không** mở ra internet: Next.js gọi nó từ server qua binding `API_URL` (Vercel tự tạo biến này lúc chạy). Vì vậy không cần CORS/`ALLOWED_ORIGINS`.
- Binding chỉ có lúc chạy, không có lúc build. `apiFetch` đọc cookie trước khi kiểm tra `API_URL`, nên `next build` coi các trang là động.
- Middleware chạy runtime Node.js (`runtime: 'nodejs'`), vì Vercel Services không hỗ trợ Edge.
- Frontend và backend luôn deploy và rollback cùng nhau.

## 1. Supabase
Project `jobportal-sg` (`nsnhygqjpbgxxueqtkrl`) đã có đủ migration, dữ liệu demo, CV mẫu, admin `admin@demo.jobportal.test`.

- SMTP Gmail (`hiuh1329@gmail.com`) và template "Mã xác nhận Job Portal" (`{{ .Token }}`) đã cấu hình.
- Authentication → URL Configuration: Site URL = `https://jobportal-sigma-five.vercel.app`, Redirect URLs có `https://jobportal-sigma-five.vercel.app/**` và `http://localhost:3000/auth/callback`.

## 2. Vercel
Biến môi trường (Production), nhập bằng `vercel env add <NAME> production`:

| Biến | Dùng bởi | Giá trị |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | web | `https://nsnhygqjpbgxxueqtkrl.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | web | publishable key (`sb_publishable_…`) |
| `DATABASE_URL` | api | transaction pooler cổng 6543 (như `backend/.env`) |
| `SUPABASE_URL` | api | `https://nsnhygqjpbgxxueqtkrl.supabase.co` |
| `SUPABASE_ANON_KEY` | api | publishable key |

`API_URL` **không** nhập tay: binding tự tạo.

Deploy từ máy: `npx vercel@latest deploy --prod` (project đã link trong `.vercel/`, thư mục này bị gitignore).

## 3. Sau khi deploy
- Chạy E2E vào bản thật: `E2E_BASE=https://jobportal-sigma-five.vercel.app node e2e.mjs` (xem `.scratch/job-portal/e2e/README.md`).
