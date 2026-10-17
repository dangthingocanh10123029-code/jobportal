# E2E thủ công (Playwright + Supabase thật)

Chạy trên dev server `http://localhost:3000` với `.env.local` trỏ tới Supabase thật. Không gửi email OTP:
`seed.sql` tạo sẵn 2 tài khoản đã xác nhận (`e2e.employer@jobportal.test`, `e2e.candidate@jobportal.test`, mật khẩu `E2eTest!2026`).

```bash
# Playwright cài ngoài repo (không thêm vào package.json), dùng Chrome có sẵn
mkdir -p /tmp/e2e && cd /tmp/e2e && npm init -y && PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm i playwright@1.52.0
cp <repo>/.scratch/job-portal/e2e/* /tmp/e2e/
zsh cleanup.sh "<session pooler URL>" && psql "<session pooler URL>" -f seed.sql
node e2e.mjs            # 27 bước
zsh cleanup.sh "<session pooler URL>"   # xóa CV qua Storage API, không để file mồ côi
```
