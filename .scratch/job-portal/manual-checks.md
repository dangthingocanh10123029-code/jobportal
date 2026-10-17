# Kiểm tra tay trên Supabase thật

Project `boncnxhjkbqxlcebzcyc`, 7 migration đã push (2026-10-16). Kiểm tra bằng `.scratch/job-portal/rls_checks.sql`:
chạy với từng role thật (`anon`, `authenticated` + JWT giả) trong một transaction **ROLLBACK** — không để lại dữ liệu, không gửi email.
Chạy lại: `psql "<session pooler URL>" -q -At -f .scratch/job-portal/rls_checks.sql`

## Đã kiểm tra — 55/55 PASS (SQL) + PGRST103 qua REST
- [x] `npm run build` xanh khi có `.env.local`
- [x] 01: trigger tạo profile đúng role; role sai bị CHECK chặn; Candidate chỉ đọc profile mình; không sửa được role; sửa được phone; anon đọc `employer_companies`, không đọc `profiles`
- [x] 02: Employer B không thấy/sửa tin của A; Candidate không tạo tin; tin mới là DRAFT; không insert thẳng PUBLISHED; trigger chặn sửa CLOSED, DRAFT→CLOSED, đăng deadline quá khứ; CHECK lương
- [x] 03: anon không thấy DRAFT, thấy CLOSED; `open_job_postings` chỉ có PUBLISHED chưa hết hạn; owner thấy DRAFT của mình
- [x] 04: `f_unaccent` bỏ dấu + đ/Đ; tìm không dấu; location contains; `%` được escape
- [x] 05: Storage chặn upload vào thư mục người khác; RPC chặn CV lạ, tin CLOSED/hết hạn/DRAFT, nộp trùng, Employer, anon; nộp thành công → SUBMITTED + 1 Status Change; không insert `applications` trực tiếp; history append-only
- [x] 06: Candidate khác không thấy/rút đơn; view tóm tắt đúng; Candidate không chuyển REVIEWING; rút ở REVIEWING được; rút lại bị chặn
- [x] 07: Employer B không thấy đơn/CV/đổi trạng thái; Employer A thấy tên + SĐT, đọc được CV; transition hợp lệ được, WITHDRAWN/nhảy cóc bị chặn; Candidate thấy Status Change mới
- [x] 09A: PostgREST trả `PGRST103` (416) khi page vượt range → code fallback đúng nhánh

## Chưa kiểm tra — cần chạy app thật với tài khoản thật
- [x] Đăng ký → mã OTP qua email (SMTP Gmail) → xác nhận + đăng nhập → `/account` → cập nhật hồ sơ (2026-10-16 17:20)
- [x] Đăng xuất / đăng nhập, chặn route theo role (E2E 2026-10-17)
- [x] Upload CV thật qua Storage API (E2E)
- [x] Storage API: xóa được CV mồ côi, KHÔNG xóa được CV đã gắn đơn (`resumes_delete_unused`) — `e2e/remaining.sh`
- [x] `createSignedUrl` 60s cho Employer tải CV — trả về PDF (E2E)
- [x] Hai request đồng thời (Ứng viên rút + Employer từ chối): B chờ khóa `FOR UPDATE` rồi bị `INVALID_TRANSITION`; kết quả WITHDRAWN, 2 Status Change
- [x] Security advisor: 2 security-definer view + RPC submit/change status là đúng thiết kế; `handle_new_user` đã revoke EXECUTE (ticket 13); còn `auth_leaked_password_protection` (bật trong Dashboard, gói Pro)

## E2E Playwright — 27/27 PASS (2026-10-17)
Script: `.scratch/job-portal/e2e/`. Đăng tin → tìm kiếm/lọc → nộp CV → tải CV → đổi trạng thái → lịch sử → rút đơn → đóng tin → đăng xuất. DB khớp: tin CLOSED, đơn WITHDRAWN, 3 Status Change, CV `application/pdf` trong bucket `resumes`.

## Ticket 13 (2026-10-17)
- [x] Migration 0700 đã push: xóa Employer kéo theo tin + đơn; xóa Candidate không bị chặn; 55/55 rls_checks vẫn PASS
- [x] `/auth/callback`: thiếu/sai code → `/login?error=link`; Redirect URLs đã thêm `http://localhost:3000/auth/callback`
- [x] E2E chạy lại 27/27 PASS
- [ ] Bấm link trong email thật → vào app đã đăng nhập (cần một lượt đăng ký thật)
