# Design System — Trắng & Xanh biển (v7, ticket 53)

Người dùng cung cấp ngày 2026-10-20, thay `soft-minimalism-brief.md` (v6). Giữ nguyên nội dung gốc dưới đây.

Áp dụng thống nhất cho toàn bộ giao diện. Không tự ý thêm màu ngoài bảng dưới.

## Màu sắc (khai báo dưới dạng CSS variables trong :root)
--bg: #FFFFFF;              /* nền toàn trang và thẻ, trắng xuyên suốt */
--surface-muted: #F0F9FF;   /* hover hàng, header bảng, vùng được chọn */
--border: #E5E7EB;          /* viền 1px cho thẻ, input, bảng */
--border-strong: #CBD5E1;   /* viền input khi hover */

--primary: #0369A1;         /* màu chủ đạo: nút Primary, link, tab active */
--primary-hover: #075985;
--primary-soft: #E0F2FE;    /* badge, chip bộ lọc đang bật */
--accent: #0EA5E9;          /* icon, biểu đồ, focus ring */
--ring: rgba(14,165,233,.20);

--text-strong: #0C1E2E;     /* tiêu đề */
--text: #334155;            /* nội dung */
--text-muted: #64748B;      /* nhãn, chú thích */

--success: #059669; --warning: #D97706; --danger: #DC2626;

## Typography
- Font: "Inter", fallback "Be Vietnam Pro", system-ui, sans-serif.
- H1: 28px / 700 / letter-spacing -0.02em / màu --text-strong.
- H2: 20px / 600 / letter-spacing -0.01em.
- H3: 16px / 600.
- Body: 14px / 400 / line-height 1.6 / màu --text.
- Label: 12px / 500 / uppercase / letter-spacing 0.04em / màu --text-muted.
- Số liệu và bảng: font-variant-numeric: tabular-nums.

## Layered & Depth
- Thẻ (card): nền trắng, border 1px var(--border), border-radius 16px.
- Bóng thẻ nhiều lớp:
  box-shadow: 0 1px 2px rgba(12,30,46,.04),
              0 4px 8px rgba(12,30,46,.04),
              0 12px 24px rgba(12,30,46,.05);
- Không dùng nền xám cho trang. Chiều sâu chỉ đến từ bóng và viền mảnh.

## Khoảng trắng
- Thang spacing theo bội số 4px: 4, 8, 12, 16, 24, 32, 48.
- Padding trong thẻ: 24px. Khoảng cách giữa các khu vực chức năng: 32px.
- Ưu tiên giao diện thoáng. Không nhồi nhiều khối sát nhau.

## Controls (input, select, bộ lọc)
- Border-radius 12px đồng nhất. Cao 40px. Padding ngang 12px.
- Mặc định: border 1px var(--border).
- Hover: border var(--border-strong).
- Focus: border var(--accent) + box-shadow 0 0 0 4px var(--ring).
- Transition: all 150ms ease.

## Buttons
- Bo góc 12px, cao 40px, padding ngang 16px, font 14px / 500.
- Primary: nền var(--primary), chữ trắng,
  box-shadow 0 1px 2px rgba(3,105,161,.25), 0 6px 14px rgba(3,105,161,.20);
  hover: nền var(--primary-hover), translateY(-1px).
- Secondary: nền trắng, border var(--border), chữ var(--text-strong);
  hover: nền var(--surface-muted).
- Ghost: không nền, không viền, chữ var(--primary).
- Mỗi khu vực chỉ có tối đa 1 nút Primary.

## Bảng dữ liệu
- Header: nền var(--surface-muted), chữ dạng Label.
- Hàng: border-bottom 1px var(--border); hover nền var(--surface-muted).
- Cột số căn phải, dùng tabular-nums.

## Quy tắc chung
- Luôn dùng biến CSS, không hard-code mã màu trong component.
- Responsive: gutter 16px trên mobile, không cuộn ngang trang.
- Nếu dùng Tailwind/shadcn: map các biến trên vào theme (primary = #0369A1, radius = 12px).
