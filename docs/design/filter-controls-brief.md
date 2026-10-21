# Brief: đồng nhất control trong sidebar bộ lọc (bổ sung ticket 55)

Người dùng cung cấp ngày 2026-10-21. Tóm tắt nguyên văn các yêu cầu:

- Class chung (vd `.form-control`) cho input, select, number trong sidebar: height 44px; width 100%; box-sizing border-box; padding 0 14px; radius 12px; border 1px var(--border); nền trắng; font 14px Inter màu var(--text); placeholder var(--text-muted); hover border var(--border-strong); focus outline none + border var(--accent) + box-shadow 0 0 0 4px var(--ring); transition border-color/box-shadow 150ms.
- `<select>` (Ngành nghề, Sắp xếp): appearance none (-webkit/-moz); padding-right 40px; chevron-down SVG inline 16px màu var(--text-muted) bằng background-image, position right 14px center, no-repeat; khi focus chevron màu var(--primary).
- Input number (Kinh nghiệm tối đa): ẩn spinner (`::-webkit-inner/outer-spin-button { -webkit-appearance: none; margin: 0 }`, `-moz-appearance: textfield`). Tùy chọn nút −/+ 28px bo 8px nền var(--surface-muted).
- Bố cục: label 12px/500/uppercase/letter-spacing .04em/var(--text-muted), cách control 8px; khoảng cách nhóm 24px; nút "Áp dụng bộ lọc" cao 44px, bo 12px, full width, cách nhóm cuối 24px; nút phụ "Xóa bộ lọc" kiểu ghost chữ var(--primary) dưới nút Áp dụng.
- Nếu dùng shadcn/ui thì dùng Select của shadcn (dự án KHÔNG dùng shadcn → bỏ qua).
- Kiểm tra: 4 control (Ngành nghề, Kinh nghiệm, Kỹ năng, Sắp xếp) cao bằng nhau, cùng viền/bo/padding; Chrome, Firefox, Safari không còn mũi tên/spinner native; chụp sidebar trước/sau.
