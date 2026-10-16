# 01: Đăng ký, đăng nhập và vai trò Candidate/Employer

**What to build:** Visitor đăng ký bằng email/mật khẩu và chọn vai trò Candidate hoặc Employer, đăng nhập, đăng xuất, cập nhật hồ sơ (Candidate: họ tên, SĐT; Employer: tên công ty). Trang của vai trò này bị chặn với vai trò kia. Có layout chung với thanh điều hướng theo vai trò. Spec: user stories 1–5.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Migration bảng `profiles` (role CANDIDATE|EMPLOYER) + RLS theo spec
- [ ] Supabase Auth dùng session cookie phía server cho App Router; helper lấy actor (user id + role) từ session để các ticket sau dùng
- [ ] Middleware chặn `/employer/*` với Candidate, `/candidate/*` với Employer, chuyển hướng về đăng nhập khi chưa đăng nhập
- [ ] Server Actions có Zod validation cho đăng ký và cập nhật hồ sơ; có test cho trường hợp input sai
- [ ] Kiểm tra tay trên Supabase thật: đăng ký 2 vai trò, không đọc được profile của người khác
- [ ] `npm test` và `npm run typecheck` xanh
