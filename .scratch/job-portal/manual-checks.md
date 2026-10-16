# Kiểm tra tay trên Supabase thật (chưa kiểm tra)

Worker không có `.env.local`, nên các mục dưới đây **chưa được kiểm tra**. Chạy sau khi tạo `.env.local` và `supabase db push`.

## 01 — Accounts and roles
- [ ] Chạy migration `20261016000000_profiles.sql`
- [ ] Đăng ký 2 vai trò → trigger `handle_new_user` tạo profile đúng role/tên
- [ ] RLS: không đọc được profile của người khác
- [ ] Không sửa được `role` (column grant)
- [ ] View `employer_companies` đọc được bằng anon
- [ ] Middleware refresh session cookie; đăng nhập/đăng xuất end-to-end
