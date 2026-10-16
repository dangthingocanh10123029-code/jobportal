# Wayfinder Map: VibeCoding Job Portal (Next.js 15 + Supabase)

## Destination
Hệ thống tìm việc online gồm 3 domain liên kết — Job Posting, Job Search, Application — kèm trang ứng viên, trang nhà tuyển dụng và test tự động xanh.

## Decisions so far
- [Stack]: Next.js 15 App Router + Supabase (Postgres, Auth, Storage, RLS) + Vitest.
- [Kiến trúc]: Deep Modules + Seams, mỗi domain có InMemory & Supabase adapter (xem `CODING_STANDARDS.md`).

## Fog (cần chốt qua `/grill-me` trước khi viết spec)
1. **Vai trò & Auth**: một tài khoản có thể vừa là Candidate vừa là Employer không? Employer có nhiều thành viên (nhiều HR) không?
2. **Duyệt tin**: tin tuyển dụng có cần admin duyệt trước khi PUBLISHED không?
3. **Hết hạn tin**: chuyển EXPIRED bằng cron job hay tính lúc truy vấn (`deadline < now()`)?
4. **Nộp lại**: ứng viên bị REJECTED hoặc đã WITHDRAWN có được nộp lại cùng tin không?
5. **Resume**: upload file PDF lên Supabase Storage, hay CV dạng form có cấu trúc, hay cả hai?
6. **Tìm kiếm**: Postgres Full-text Search có hỗ trợ tiếng Việt không dấu (`unaccent`) hay `ILIKE` đơn giản là đủ?
7. **Transition đơn**: những bước chuyển nào hợp lệ (ví dụ REVIEWING → OFFERED có được bỏ qua INTERVIEWING không)? Ai được chuyển (ứng viên chỉ WITHDRAWN)?
8. **Thông báo**: có gửi email khi trạng thái đơn thay đổi không, hay chỉ hiển thị trên trang?

## Out of scope
- Thanh toán đăng tin, gói VIP.
- Gợi ý việc làm bằng AI, chat realtime.
