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
- [ ] Đăng xuất / đăng nhập lại, refresh session cookie qua middleware
- [ ] Upload CV thật qua Storage API, file mồ côi bị dọn khi nộp lỗi (policy `resumes_delete_unused` — Supabase chặn DELETE storage bằng SQL nên chỉ thử được qua API)
- [ ] `createSignedUrl` 60s cho Employer tải CV
- [ ] Hai request rút/đổi trạng thái đồng thời (`FOR UPDATE`) chỉ tạo 1 Status Change
- [ ] Supabase advisor cảnh báo security-definer view `employer_application_summaries` / `employer_companies` — đúng thiết kế
