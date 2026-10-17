# Mission: Xây dựng Job Portal — Hệ thống tìm việc online

## Why
Tự tay ship một sản phẩm Full-stack thực tế (Next.js 15 App Router + Supabase + Vitest) bằng quy trình AI pair-programming theo bộ skills của Matt Pocock, đạt chuẩn kiến trúc Deep Modules, Seams và TDD.

## Success looks like
- Vận hành đủ "The Golden Flow" từ ý tưởng đến Pull Request: `/wayfinder` → `/grill-me` → `/to-spec` → `/to-tickets` → `/codebase-design` → `/tdd` / `/implement` → `/code-review` → `/pr`.
- Hoàn thành 3 domain nghiệp vụ liên kết:
  1. **Job Posting** — Nhà tuyển dụng tạo, đăng, đóng tin tuyển dụng; tin tự hết hạn theo hạn nộp.
  2. **Job Search** — Ứng viên tìm việc theo từ khóa, địa điểm, mức lương, hình thức làm việc.
  3. **Application** — Ứng viên nộp đơn kèm CV; nhà tuyển dụng xử lý đơn qua state machine.
- Hai giao diện: trang ứng viên (tìm việc, theo dõi đơn) và trang nhà tuyển dụng (quản lý tin, xử lý đơn).
- Mỗi domain có `InMemory` adapter cho test nhanh và `Supabase` adapter cho dữ liệu thật; test chạy thật và xanh.

## Constraints
- Next.js 15 (App Router, TypeScript strict) + Supabase (PostgreSQL, Auth, Storage, RLS) + Vitest.
- Thao tác ghi nhiều bảng phải atomic (stored procedure / RPC), không ghi rời rạc nhiều lệnh từ tầng ứng dụng.
- Tài liệu viết bằng tiếng Việt, thuật ngữ kỹ thuật giữ tiếng Anh (xem `NOTES.md`).

## Out of scope
- Thanh toán đăng tin / gói VIP cho nhà tuyển dụng.
- Gợi ý việc làm bằng AI/ML, chat realtime giữa ứng viên và nhà tuyển dụng.
- Kiến trúc microservices, multi-region.
