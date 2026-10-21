# 56: Header dạng viên thuốc nổi (logo trái · menu giữa · CTA phải)

**What to build:** Thiết kế lại `src/components/navigation/site-header.tsx` theo `docs/design/header-pill-brief.md`: lấy hình dáng của brief, GIỮ màu xanh v7, tên và logo Job Portal, nền trang trắng. Không đổi phần khác của trang.

**Blocked by:** —

**Status:** resolved

## Quyết định của Coordinator
- **Khung:** sticky, `top: 12px`, `width: min(92%, 1240px)`, cao 60px (mobile 56px), nền `color-mix(in srgb, var(--bg) 90%, transparent)` + `backdrop-filter: blur(12px)`, viền 1px `var(--border)`, bóng rất nhẹ (lớp đầu của bóng thẻ v7), `border-radius: 9999px`, padding ngang 8px 20px. Bỏ kiểu thanh trắng full-width của ticket 53. Áp cho mọi trang kể cả admin layout (sidebar admin không bị header đè).
- **Menu giữa (tối đa 5 mục, phần còn lại vào menu tài khoản):**
  - Khách: Việc làm, Công ty, Lương, Cẩm nang, Nhà tuyển dụng.
  - Candidate: Việc làm, Đơn ứng tuyển, Lịch phỏng vấn, CV online, Cẩm nang.
  - Employer: Dashboard, Tin tuyển dụng, Tìm ứng viên, Lịch phỏng vấn, Gói dịch vụ.
  - Admin: Việc làm, Công ty, Cẩm nang, Quản trị.
  - Chữ 14px / 500, màu `var(--text)`, hover `var(--text-strong)` + transition 150ms, gap 28px (tablet 20px); mục đang ở trang hiện tại: `aria-current="page"`, chữ `var(--primary)`.
- **Bên phải:** icon Tin nhắn + Thông báo (giữ badge, aria-label như cũ) · menu tài khoản (avatar `avatarFor(userId)` hoặc icon; `<details>`/popover, bo 16px, bóng thẻ v7) chứa: Tài khoản, các link còn lại của vai trò (Candidate: Hồ sơ của tôi, Việc đã lưu, Thông báo việc làm, Công ty, Lương; Employer: Hồ sơ công ty, Việc làm, Công ty, Cẩm nang; Admin: các mục admin), nút "Đăng xuất" · CTA viên thuốc.
  - CTA: khách "Tạo tài khoản" (+ link chữ "Đăng nhập" bên trái CTA); Employer "Đăng tin" → `/employer/postings/new`; Candidate "Tạo CV" → `/candidate/cv`; Admin không có CTA.
  - CTA: nền `var(--navy)`, chữ trắng, cao 36px, padding 0 22px, 13px / 600, radius 9999px, hover nền `color-mix(in srgb, var(--navy) 80%, white)`, transition 150ms. Đây là ngoại lệ có chủ ý với quy tắc nút bo 12px của v7, chỉ trong header.
- **Responsive:** ≥ 1100px đủ 3 vùng; 1000–1099px gap menu 16–20px, ẩn chữ link Đăng nhập nếu cần; < 1000px ẩn menu giữa, hiện nút hamburger (menu đầy đủ mọi link như hiện tại); ≤ 420px CTA thu thành icon có `aria-label`. Không tràn ngang ở 375/390/1280/1440 với cả 4 vai trò.
- **Tên truy cập E2E giữ nguyên:** link "Job Portal, trang chủ"; nút "Đăng xuất"; link "Đăng nhập"; aria-label chuông/tin nhắn; "Mở menu". Nếu "Đăng xuất" nằm trong menu tài khoản đóng → được phép sửa `.scratch/job-portal/e2e/e2e.mjs` (ngoại lệ ownership cho ticket này) để mở menu trước khi bấm; ghi rõ trong worker_done.
- Không thêm dependency, không đổi CSS ngoài header (trừ khoảng cách đầu trang nếu header nổi làm lệch).

## Phần B — giao diện (Claude, worktree agent-codex) — branch `task/56-header-pill`
- [ ] Header mới cho khách / Candidate / Employer / Admin
- [ ] npm test, typecheck, next build xanh
- [ ] Production local + `sweep.mjs` 0 vấn đề + E2E đầy đủ 64/64 chạy vào production local (seed/cleanup theo `.scratch/job-portal/e2e/README.md`, DB trong `backend/.env`)
- [ ] Chụp header 4 vai trò ở 1440 / 1024 / 390 (+ menu tài khoản mở) vào scratchpad/e2e/t56/, tự xem và sửa
