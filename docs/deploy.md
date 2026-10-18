# Deploy — Vercel (Next.js) + Render (FastAPI) + Supabase (Singapore)

Mọi thành phần đặt ở Singapore để độ trễ thấp: Supabase `ap-southeast-1`, Render `singapore`, Vercel function `sin1` (`vercel.json`).

```
Trình duyệt → Vercel (Next.js, sin1) → Render (FastAPI, singapore) → Supabase (ap-southeast-1, transaction pooler 6543)
```

## 1. Supabase
Project `jobportal-sg` (`nsnhygqjpbgxxueqtkrl`) đã có đủ migration, dữ liệu demo, CV mẫu, admin `admin@demo.jobportal.test`.

- **SMTP** (bắt buộc cho email OTP): Dashboard → Authentication → Emails → SMTP Settings — điền như project cũ (Gmail + mật khẩu ứng dụng 16 ký tự). Sau khi lưu, template "Confirm signup" mới sửa được (gói free cấm sửa template khi chưa có SMTP riêng); Coordinator chép template có `{{ .Token }}` bằng Management API.
- Sau khi có domain Vercel: Authentication → URL Configuration → **Site URL** = `https://<domain-vercel>`, **Redirect URLs** thêm `https://<domain-vercel>/auth/callback`.

## 2. Render (FastAPI)
1. render.com → đăng nhập bằng GitHub → **New → Blueprint** → chọn repo `jobportal` (đọc `render.yaml`).
2. Nhập 4 biến bí mật:
   - `DATABASE_URL` = transaction pooler (cổng 6543) của project Singapore — lấy ở Supabase → Connect → Transaction pooler (hoặc `backend/.env` trên máy)
   - `SUPABASE_URL` = `https://nsnhygqjpbgxxueqtkrl.supabase.co`
   - `SUPABASE_ANON_KEY` = publishable key (`sb_publishable_…`)
   - `ALLOWED_ORIGINS` = `https://<domain-vercel>` (điền sau bước 3, rồi Manual Deploy lại)
3. Kiểm tra: `https://jobportal-api.onrender.com/health` → `{"status":"ok","db":true,"jwks":true}`.

> Gói free ngủ sau 15 phút không có request; request đầu tiên mất ~30–60 s. Trước buổi demo mở `/health` một lần.

## 3. Vercel (Next.js)
1. vercel.com → **Add New → Project** → import repo `jobportal` (Framework: Next.js, Root: `/`).
2. Environment Variables (Production):
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://nsnhygqjpbgxxueqtkrl.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = publishable key
   - `API_URL` = `https://jobportal-api.onrender.com`
3. Deploy. Region function đã khóa `sin1` bằng `vercel.json`.

## 4. Sau khi deploy
- Cập nhật Supabase Site URL + Redirect URLs (mục 1) và `ALLOWED_ORIGINS` trên Render.
- Chạy E2E vào bản thật: `E2E_BASE=https://<domain-vercel> node e2e.mjs` (xem `.scratch/job-portal/e2e/README.md`).
