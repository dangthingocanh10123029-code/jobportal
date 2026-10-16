# Kiểm tra tay trên Supabase thật (chưa kiểm tra)

Worker không có `.env.local`, nên các mục dưới đây **chưa được kiểm tra**. Chạy sau khi tạo `.env.local` và `supabase db push`.

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
