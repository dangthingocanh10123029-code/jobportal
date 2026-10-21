# 59 — Vẽ lại banner trang Đăng ký

Status: resolved

**What to build:** Người dùng: "thử ảnh banner khác, hiện tại đang vỡ" (banner tạo tài khoản). `public/images/signup.webp` (ticket 58) trông vỡ trên `/signup`:
- Hai người là nửa thân bị cắt ngang eo, đầu tròn xám không mặt.
- Nền gradient là một khối chữ nhật có cạnh cứng: thấy rõ mép trái/phải và mép dưới (~y 730) trên nền trang trắng.
- Quá nhiều thanh "chữ giả" xếp thành form và nút, nhìn như giao diện hỏng.
- Ảnh hiện bằng `background-size: contain` trên nền `--bg` #FFFFFF.

## Phần A (Antigravity — ảnh)
- [x] Vẽ lại `public/images/signup.webp`, 800×1000, ≤ 150 KB, kiểu minh họa phẳng v7 (Trắng & Xanh biển, `docs/design/white-blue-design-system.md`).
- [x] Bố cục đơn giản, một cảnh liền mạch: chào mừng người mới, gợi 2 vai trò (người tìm việc với CV, nhà tuyển dụng với cặp/tin tuyển dụng).
- [x] Người vẽ trọn thân (hoặc không vẽ người mà dùng đồ vật/biểu tượng). Không đầu xám trống mặt.
- [x] Viền ảnh hòa vào nền trang: 4 cạnh là #FFFFFF thuần (hoặc mờ dần về #FFFFFF), không khối nền có mép cứng.
- [x] Tối đa 2–3 thanh "chữ giả". Không chữ, số, tên công ty, logo thật.
- [x] Không đụng `auth.webp`.

## Phần B
Không cần: CSS `.auth-image-signup` đã có.

## Kiểm tra
- [x] Coordinator chụp `/signup` ở 1440 và 390, sweep 0 vấn đề.
