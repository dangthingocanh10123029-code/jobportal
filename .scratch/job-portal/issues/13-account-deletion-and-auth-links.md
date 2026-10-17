# 13: Xóa được tài khoản, link xác nhận email đăng nhập luôn, OTP ở /login giữ next

**What to build:** (1) Xóa user trong Supabase không bị chặn bởi lịch sử trạng thái; (2) bấm link "Confirm email address" trong email đưa người dùng vào app đã đăng nhập; (3) nhập mã OTP từ trang `/login?next=…` xong quay lại `next`.

**Blocked by:** 05, 11

**Status:** resolved

- [ ] Migration `20261016000700_*`: `application_status_changes.changed_by` nullable + `on delete set null`; `applications.job_posting_id` `on delete cascade` (xóa Employer → tin → đơn → lịch sử)
- [ ] `handleAuthCallback` trong `src/lib/auth-callback.ts` (exchangeCodeForSession, chỉ nhận next nội bộ), test thuần cho kiểm tra next
- [ ] `signUpAction` + `resendSignupOtpAction` gửi `emailRedirectTo = <origin>/auth/callback`
- [ ] Route `src/app/auth/callback/route.ts` gọi `handleAuthCallback`; `/login?error=link` hiện thông báo
- [ ] OTP từ `/login` xong → đi tới `next` hợp lệ
- [ ] `npm test` + `npm run typecheck` xanh; push migration lên Supabase thật

## Phân công (Orca)
- **Phần A — Claude (logic):** migration, `@/lib/auth-callback`, emailRedirectTo, test.
- **Phần B — Codex (giao diện, sau A):** route handler, thông báo lỗi link ở `/login`, OTP giữ `next`.
