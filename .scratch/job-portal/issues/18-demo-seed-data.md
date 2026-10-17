# 18: Dữ liệu mẫu

**What to build:** Bộ dữ liệu demo tự sinh, sát thực tế thị trường Việt Nam, hoàn toàn hư cấu; seed và xóa bằng một lệnh. Spec: 40. KHÔNG crawl site khác.

**Blocked by:** 17

**Status:** resolved

- [ ] `supabase/seed/seed-demo.sql`: ~40 công ty hư cấu (Employer `*@demo.jobportal.test`, đã xác nhận, logo `/images/companies/logo-XX.svg`, about/quy mô/địa chỉ), ~300 tin phủ 16 ngành, 8+ tỉnh/thành, đủ cấp bậc, lương VND/tháng theo cấp bậc (có tin thỏa thuận), hạn nộp trải 1–60 ngày (một ít đã hết hạn/đóng/nháp), mô tả/yêu cầu/quyền lợi tiếng Việt viết mới ghép từ mẫu theo ngành; ~30 ứng viên có hồ sơ; ~200 đơn với lịch sử trạng thái hợp lệ; tin đã lưu; lượt xem
- [ ] Seed idempotent (chạy lại không nhân đôi), dùng `setseed` cho dữ liệu cố định; CV mẫu: `resume_path` trỏ file PDF mẫu upload một lần
- [ ] `supabase/seed/wipe-demo.sql` xóa sạch mọi thứ của `*@demo.jobportal.test` (kể cả storage)
- [ ] `supabase/seed/README.md`: lệnh chạy, mật khẩu chung, vài tài khoản tiêu biểu để demo
- [ ] Coordinator chạy seed trên Supabase thật, chạy lại e2e + rls_checks
- [ ] `npm test` và `npm run typecheck` xanh

## Phân công (Orca)

Contract: `docs/api-contract.md`, mục 18.

- **Phần A — Claude (logic, worktree `agent-claude-logic`):** toàn bộ ticket.
