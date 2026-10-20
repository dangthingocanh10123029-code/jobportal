# E2E thủ công (Playwright + Supabase thật)

Chạy trên dev server `http://localhost:3000` (hoặc `E2E_BASE=http://localhost:3002` cho bản production: FastAPI `uv run uvicorn app.main:app --port 8011`, `API_URL=http://127.0.0.1:8011 npx next build && npx next start -p 3002`) với `.env.local` trỏ tới Supabase thật. Không gửi email OTP:
`seed.sql` tạo sẵn 2 tài khoản đã xác nhận + 1 tin đang mở thứ hai (nộp bằng CV online) (`e2e.employer@jobportal.test`, `e2e.candidate@jobportal.test`, mật khẩu `E2eTest!2026`).

```bash
# Playwright cài ngoài repo (không thêm vào package.json), dùng Chrome có sẵn
mkdir -p /tmp/e2e && cd /tmp/e2e && npm init -y && PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm i playwright@1.52.0
cp <repo>/.scratch/job-portal/e2e/* /tmp/e2e/
zsh cleanup.sh "<session pooler URL>" && psql "<session pooler URL>" -f seed.sql
node e2e.mjs            # 64 bước: cũ + 40 phỏng vấn, 41 tin nhắn, 42 CV online, 44 job alert, 45 đánh giá, 46 cẩm nang, 47 đẩy tin
zsh cleanup.sh "<session pooler URL>"   # xóa CV qua Storage API + toàn bộ dữ liệu e2e (dòng 'left:' phải toàn 0; admin_audit_log append-only nên giữ lại)
```
