# Kiểm tra tay trên Supabase thật (chưa kiểm tra)

Worker không có `.env.local`, nên các mục dưới đây **chưa được kiểm tra**. Chạy sau khi tạo `.env.local` và `supabase db push`.

- [ ] `npm run build` xanh (từ 01B, layout đọc session nên build cần biến môi trường Supabase)

## 01 — Accounts and roles
- [ ] Chạy migration `20261016000000_profiles.sql`
- [ ] Đăng ký 2 vai trò → trigger `handle_new_user` tạo profile đúng role/tên
- [ ] RLS: không đọc được profile của người khác
- [ ] Không sửa được `role` (column grant)
- [ ] View `employer_companies` đọc được bằng anon
- [ ] Middleware refresh session cookie; đăng nhập/đăng xuất end-to-end

## 02 — Employer manages job postings
- [ ] Chạy migration `20261016000100_job_postings.sql`
- [ ] RLS: Employer B không thấy DRAFT của Employer A; anon chỉ thấy PUBLISHED
- [ ] Trigger `job_postings_guard` chặn transition sai, sửa tin CLOSED, đăng với deadline quá khứ
- [ ] View `job_postings_with_company` (security_invoker) trả companyName cho anon
- [ ] `SupabaseJobPostingRepository` + Server Actions chạy end-to-end

## 03 — Browse open postings
- [ ] Chạy migration `20261016000200_open_job_postings.sql`
- [ ] RLS: anon đọc được CLOSED, không đọc được DRAFT; owner vẫn thấy DRAFT của mình
- [ ] View `open_job_postings` lọc đúng theo `now()`
- [ ] Phân trang: count exact + range qua PostgREST

## 04 — Job search and filters
- [ ] Chạy migration `20261016000300_job_search.sql` (extension unaccent, `f_unaccent`, create or replace view)
- [ ] `unaccent` bỏ dấu mọi ký tự tiếng Việt và đ/Đ giống `foldAccents()` bên JS
- [ ] ILIKE với ký tự escape `\` đi qua PostgREST đúng
- [ ] Bộ lọc `.or(salary_max.is.null, salary_max.gte.X)` đúng
- [ ] anon đọc được cột mới của view

## 05 — Candidate applies with resume
- [ ] Chạy migration `20261016000400_applications.sql`
- [ ] RLS `applications` / `application_status_changes`: Candidate chỉ thấy đơn của mình, Employer chỉ thấy đơn trên tin của mình
- [ ] RPC `submit_application`: mã lỗi POSTING_NOT_OPEN / ALREADY_APPLIED / INVALID_RESUME hiện đúng thông báo
- [ ] Bucket `resumes` private, chỉ PDF ≤ 5 MB; 3 policy storage (insert/select thư mục của mình, delete file chưa gắn đơn)
- [ ] Upload thật; nộp lỗi thì file bị dọn
- [ ] Bấm nộp hai lần chỉ tạo một Application

## 06 — Candidate tracks and withdraws
- [ ] Chạy migration `20261016000500_application_status_changes.sql`
- [ ] RPC `change_application_status`: `FOR UPDATE` dưới tải đồng thời thật (2 lần rút cùng lúc → 1 Status Change)
- [ ] RLS trên view `candidate_application_summaries`: không thấy đơn của Candidate khác
- [ ] Trang đơn của tôi + rút đơn end-to-end
