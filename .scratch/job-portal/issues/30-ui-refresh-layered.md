# 30: Làm mới giao diện — Layered & Depth

**What to build:** Áp brief thiết kế của người dùng (2026-10-17) cho toàn site, đồng thời sửa lỗi E2E: trang chủ tràn ngang ở viewport 360px.

> Thiết kế Layered & Depth: đổ bóng đa lớp (multi-layered shadows) và viền siêu mỏng (#E5E7EB) cho các thẻ nội dung, tạo chiều sâu tinh tế. Tối ưu khoảng trắng giữa các khu vực chức năng. Ô nhập liệu và bộ lọc bo góc 12px đồng nhất, trạng thái tương tác mượt. Nút Primary có độ nâng (elevation) nhẹ, phân cấp hành động rõ. Tăng tương phản tiêu đề, tối ưu letter-spacing để quét dữ liệu nhanh. Nền trắng #FFFFFF xuyên suốt.

**Blocked by:** 29 (Phần B)

**Status:** resolved

- [ ] Token CSS (theo bảng màu contract, đã cập nhật v4): `--color-surface: #FFFFFF`, `--color-border: #E5E7EB`, `--radius-control: 12px`, `--shadow-card` đa lớp (vd `0 1px 2px rgb(15 23 42 / 4%), 0 4px 12px rgb(15 23 42 / 6%), 0 12px 32px rgb(15 23 42 / 4%)`), `--shadow-card-hover`, `--shadow-primary` (nâng nhẹ cho nút chính); nền trang và card đều trắng
- [ ] Mọi thẻ (card tin, công ty, đơn, dashboard, form): viền 1px `--color-border` + `--shadow-card`; hover nâng nhẹ (transform ≤ 2px, transition 150–200ms, tôn trọng `prefers-reduced-motion`)
- [ ] Mọi input/select/textarea/chip lọc: bo 12px, focus ring rõ (2px primary, offset), hover đổi viền; cao tối thiểu 44px cho chạm
- [ ] Nút: primary có `--shadow-primary` + hover/active; secondary/quiet phẳng có viền; disabled rõ ràng
- [ ] Typography: h1/h2 dùng `--color-text` đậm hơn, letter-spacing âm nhẹ cho tiêu đề lớn, số liệu (lương, đếm) `font-variant-numeric: tabular-nums`
- [ ] Khoảng trắng: tăng gap giữa các section (vd 48–64px desktop, 32px mobile), padding card nhất quán
- [ ] Sửa tràn ngang ở 360px (trang chủ; rà mọi trang) — `document.documentElement.scrollWidth <= innerWidth`
- [ ] Tương phản WCAG AA cho chữ phụ trên nền trắng; không đổi nội dung/luồng; chụp so sánh trước/sau ở 1280px và 360px (đính kèm đường dẫn ảnh trong worker_done)
- [ ] npm test + typecheck xanh

## Phân công (Orca)
- **Codex:** toàn bộ ticket (`src/app/**`, `src/components/**`, CSS).
