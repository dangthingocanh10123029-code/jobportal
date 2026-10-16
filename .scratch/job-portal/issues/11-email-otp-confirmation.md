# 11: Xác nhận email bằng mã OTP khi đăng ký

**What to build:** Supabase giữ bật Confirm email. Sau khi đăng ký, Visitor nhập mã OTP trong email để xác nhận và được đăng nhập luôn; có nút gửi lại mã. Đăng nhập bằng tài khoản chưa xác nhận thì được dẫn sang bước nhập mã. Spec: user story 2a.

**Blocked by:** 01

**Status:** in-progress

- [ ] `verifySignupOtpAction` dùng `supabase.auth.verifyOtp({ email, token, type: 'email' })`, set session cookie, trả Profile
- [ ] `resendSignupOtpAction` dùng `supabase.auth.resend({ type: 'signup', email })`
- [ ] Zod: email hợp lệ, token 6–10 chữ số; map lỗi GoTrue (`otp_expired`, `over_email_send_rate_limit`, `over_request_rate_limit`) sang tiếng Việt; test input sai
- [ ] UI: sau đăng ký `needsEmailConfirmation` → màn nhập mã (ô số, gửi lại có đếm ngược 60 giây); xác nhận xong về `/account`
- [ ] UI: đăng nhập gặp "Email chưa được xác nhận" → nút "Nhập mã xác nhận" mở cùng màn đó (gửi lại mã trước)
- [ ] Dashboard (người dùng làm): template "Confirm signup" chứa `{{ .Token }}`; SMTP riêng để gửi được tới mọi địa chỉ
- [ ] `npm test` và `npm run typecheck` xanh

## Phân công (Orca)

Contract: `docs/api-contract.md`, mục ticket 11.

- **Phần A — Claude (logic, worktree `agent-claude-logic`):** 2 action mới trong `@/actions/auth` + schema Zod + map lỗi + test.
- **Phần B — Codex (giao diện, worktree `agent-codex`, sau khi Phần A merge):** màn nhập mã trong luồng `/signup` và lối vào từ `/login`.
