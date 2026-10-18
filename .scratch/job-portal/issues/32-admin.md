# 32: Trang quản trị (Admin)

**What to build:** Vai trò ADMIN với tổng quan hệ thống, quản lý người dùng (khóa/mở), kiểm duyệt tin (ẩn/bỏ ẩn kèm lý do + thông báo Employer), xác minh công ty (huy hiệu ✓), nhật ký thao tác append-only. Spec: stories 41–48. Contract: mục 32.

**Blocked by:** 31

**Status:** resolved

### Phần A — Claude logic (DB + FastAPI + Server Actions + middleware)
- [ ] Migration `20261017000500_admin.sql`:
  - `profiles.role` CHECK thêm `ADMIN`; **`handle_new_user` chỉ nhận role CANDIDATE|EMPLOYER từ metadata (ADMIN/khác → lỗi)** — chặn tự cấp quyền
  - `profiles.locked_at`, `locked_reason`; `job_postings.hidden_at`, `hidden_reason`, `hidden_by`; `companies.verified_at`; các cột này KHÔNG có column grant cho authenticated
  - `public.is_admin()` (security definer, stable) đọc role của `auth.uid()`; RLS: ADMIN đọc mọi profiles / job_postings / applications (chỉ số liệu) / companies / audit
  - Bảng `admin_audit_log` append-only (không grant update/delete), RLS chỉ ADMIN đọc
  - RPC security definer, kiểm `is_admin()` + ghi audit trong cùng transaction: `admin_set_user_lock(user_id, locked, reason)` (đặt/xóa `auth.users.banned_until` = 'infinity'; cấm tự khóa + khóa ADMIN), `admin_set_posting_hidden(posting_id, hidden, reason)` (tạo notification `POSTING_HIDDEN` cho Employer), `admin_set_company_verified(company_id, verified)`; revoke từ public/anon
  - Tin ẩn: loại khỏi policy select công khai + `open_job_postings` + `job_postings_with_company` cho người ngoài (chủ tin và ADMIN vẫn thấy); RPC `submit_application` vì vậy từ chối tin ẩn
  - `admin_stats()` (json đúng hình `AdminStats`, 30 ngày đủ phần tử, timezone Asia/Ho_Chi_Minh) + view/hàm phân trang cho users (join auth.users lấy email, last_sign_in_at), postings, companies, audit
  - `notifications.type` CHECK thêm `POSTING_HIDDEN`
- [ ] FastAPI `backend/app/modules/admin/**` + `require_admin`; `current_user` từ chối tài khoản `locked_at is not null` (403 'Tài khoản đã bị khóa: <lý do>') — cache role phải tính cả trạng thái khóa (TTL ngắn hoặc bỏ cache khi khóa)
- [ ] `companyVerified` trong summary/detail/company; `hiddenAt/hiddenReason` trong JobPosting của Employer
- [ ] `src/actions/admin.ts` + types theo contract; middleware chặn `/admin/*` với không phải ADMIN, đăng xuất + `/login?error=locked` khi bị khóa; `signInAction` báo khóa
- [ ] `supabase/seed/make-admin.sql` (nâng một email thành ADMIN) + tài khoản `admin@demo.jobportal.test` trong seed demo (README ghi rõ)
- [ ] Test: pytest (service admin InMemory + integration admin RPC trên DB thật rollback: không phải admin bị từ chối, tự khóa bị từ chối, audit ghi đúng, tin ẩn biến mất với anon, đăng ký với metadata role ADMIN bị từ chối); Vitest cho Zod admin actions

### Phần B — Codex (giao diện, sau Phần A + ticket 34)
- [ ] `/admin`: thẻ số liệu, biểu đồ 30 ngày (SVG/CSS, không thêm thư viện), top công ty/ngành
- [ ] `/admin/users` (tìm, lọc vai trò/khóa, phân trang), `/admin/users/[id]` (chi tiết, khóa/mở có hộp lý do + xác nhận)
- [ ] `/admin/postings` (lọc trạng thái/ẩn, ẩn/bỏ ẩn kèm lý do), `/admin/companies` (xác minh/bỏ), `/admin/audit` (lọc theo hành động)
- [ ] Layout admin riêng (sidebar trên desktop, menu gọn trên mobile 360px) theo design system ticket 34; huy hiệu ✓ công ty xác minh trên trang công ty + thẻ tin; nhãn "Bị ẩn" + lý do ở `/employer/postings`; thông báo `/login?error=locked`

- [ ] pytest + ruff + integration, npm test + typecheck xanh; Coordinator: rls_checks, v2_checks, E2E + bước admin

## Phân công (Orca)
- **Phần A — Claude logic**, **Phần B — Codex**.
