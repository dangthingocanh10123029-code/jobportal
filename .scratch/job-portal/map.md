# Wayfinder Map: Job Portal (Next.js 15 + Supabase)

## Destination
Hệ thống tìm việc online gồm 3 domain liên kết — Job Posting, Job Search, Application — kèm trang ứng viên, trang nhà tuyển dụng và test tự động xanh.

## Decisions so far
- [Stack]: Next.js 15 App Router + Supabase (Postgres, Auth, Storage, RLS) + Vitest.
- [Kiến trúc]: Deep Modules + Seams, mỗi domain có InMemory & Supabase adapter (`CODING_STANDARDS.md`).
- [Vai trò]: mỗi tài khoản đúng 1 vai trò (Candidate hoặc Employer), Employer = 1 người. Không có Admin.
- [Duyệt tin]: không duyệt, Employer đăng là PUBLISHED ngay.
- [Hết hạn]: EXPIRED tính lúc truy vấn — ADR-0001.
- [Nộp lại]: mỗi tin chỉ nộp 1 lần, kể cả sau REJECTED/WITHDRAWN — ADR-0002.
- [Resume]: file PDF trên Supabase Storage (bucket private).
- [Tìm kiếm]: `unaccent` + `ILIKE` trên tiêu đề/mô tả, lọc địa điểm, lương, hình thức làm việc.
- [Trạng thái đơn]: tuần tự, Employer REJECTED được ở mọi bước chưa kết thúc, Candidate WITHDRAWN trước khi HIRED.
- [Thông báo]: không email, chỉ hiển thị trên trang.

Spec: `.scratch/job-portal/spec.md` · Tickets: `.scratch/job-portal/issues/`

## Out of scope
- Thanh toán đăng tin, gói VIP, Admin/kiểm duyệt.
- Gợi ý việc làm bằng AI, chat realtime, email thông báo, Saved Job.
