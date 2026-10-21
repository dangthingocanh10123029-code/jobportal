# 60 — Vẽ lại banner trang Đăng nhập

Status: resolved

**What to build:** Người dùng: "thay ảnh khác ảnh này bị AI quá". Đây là `public/images/auth.webp` trên `/login`, hiện được hiển thị ~72% chiều cao khung, nền trắng.

Ảnh cũ trông "AI" vì:
- ổ khóa phát sáng có quầng tròn;
- thẻ hồ sơ và các hàng giao diện giả đầy thanh chữ giả;
- quầng gradient mờ phía sau.

## Phần A (Antigravity — ảnh)
- [x] Vẽ lại `public/images/auth.webp`, 800×1000, ≤ 150 KB, bảng màu v7 (`docs/design/white-blue-design-system.md`).
- [x] Một cảnh đời thường cụ thể, kiểu minh họa phẳng vẽ tay tối giản (editorial, như minh họa sách/tạp chí), ít chi tiết. Ví dụ: một người ngồi bàn làm việc với laptop, tách cà phê, chậu cây, cửa sổ.
- [x] Không thanh chữ giả hay UI giả, không ổ khóa/khiên/biểu tượng bảo mật, không quầng sáng/glow, không lấp lánh hay ngôi sao.
- [x] Hình khối đơn giản, nét đều, 3–4 màu chính. Người có mặt cơ bản, tỉ lệ tự nhiên.
- [x] 4 cạnh ảnh #FFFFFF thuần, không khối nền có mép cứng.
- [x] Không chữ, số hay logo thật. Khác hẳn `signup.webp` (không đụng file đó).

## Kiểm tra
- [x] Coordinator chụp `/login` ở 1440 và 1280.
