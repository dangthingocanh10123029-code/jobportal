# 57: Dải logo "Được tin dùng bởi các nhà tuyển dụng" — logo ngang (icon + wordmark)

**What to build:** Thay 10 ô vuông icon bằng logo ngang trông như thương hiệu thật (kiểu dải logo Stripe/Vercel/Linear). Người dùng chọn: **dùng chính các công ty demo có trong hệ thống** (không dùng logo công ty thật, không bịa tên mới) và **logo luôn hiện màu** (không grayscale). Brief gốc người dùng gửi ngày 2026-10-21 (chế độ A/B) được thay bằng lựa chọn này.

**Blocked by:** —

**Status:** open

## 10 công ty (tên phải khớp đúng `companies.name` trong DB)
| slug | Wordmark | companies.name |
|---|---|---|
| ong-heo | Ống Heo | Công ty Tài chính Tiêu dùng Ống Heo |
| canh-dieu | Cánh Diều | Công ty TNHH Bao bì Cánh Diều |
| doi-thong | Đồi Thông | Công ty TNHH Giải pháp Phần mềm Đồi Thông |
| dom-dom | Đom Đóm | Công ty TNHH Linh kiện Chính xác Đom Đóm |
| dong-que-ngot | Đồng Quê Ngọt | Công ty Cổ phần Thực phẩm Đồng Quê Ngọt |
| bep-me-nau | Bếp Mẹ Nấu | Công ty TNHH Chuỗi Nhà hàng Bếp Mẹ Nấu |
| may-bac | Mây Bạc | Công ty Cổ phần Công nghệ Mây Bạc |
| hat-mam-xanh | Hạt Mầm Xanh | Công ty Cổ phần Giáo dục Hạt Mầm Xanh |
| hai-au-trang | Hải Âu Trắng | Công ty TNHH Khách sạn Hải Âu Trắng |
| cau-vong-so | Cầu Vồng Số | Công ty TNHH Phần mềm Cầu Vồng Số |

## Phần A — Antigravity (hình ảnh) — branch `task/57-a-logo-wordmarks`
- [ ] `public/logos/<slug>.svg` × 10: logo NGANG = biểu tượng đơn giản (gợi đúng tên: con heo đất, cánh diều, cây thông, đom đóm, bông lúa, nồi/bếp, đám mây, hạt mầm, chim hải âu, cầu vồng) + wordmark tên tiếng Việt CÓ DẤU ĐÚNG.
- [ ] Chữ wordmark **chuyển thành path** (không dùng `<text>`, vì `<img>` SVG không tải được web font) — kiểm dấu tiếng Việt (Ố, Đ, ồ, ầ, ả, ắ…) hiển thị đúng.
- [ ] Mỗi logo một phong cách chữ khác nhau (sans, geometric, rounded, serif nhẹ, đậm/mảnh) để trông như 10 công ty khác nhau; mỗi logo 1–2 màu (màu thương hiệu riêng được phép, đủ tương phản trên nền trắng ≥ 3:1), không gradient sặc sỡ.
- [ ] Cùng `viewBox` cao 32 (vd `0 0 W 32`), `width`/`height` ghi trong file, chiều rộng tự nhiên ≤ 200; không nền, không ô vuông bao; SVG gọn, không raster/script.
- [ ] KHÔNG mô phỏng logo công ty thật nào.
- [ ] Chỉ sửa `public/logos/**`. `npm run build` xanh. Commit, worker_done kèm danh sách file + kích thước (W×32) từng logo.

## Phần B — giao diện (Claude, worktree agent-codex) — chờ Phần A — branch `task/57-b-logo-strip`
- [ ] `src/components/home/logo-strip.tsx`: mảng dữ liệu tách riêng `const partners = [{ name, slug, src, width }]` (vd `src/components/home/partners.ts`); ghép với `listCompanies` theo `name` để lấy id → link `/companies/[id]`; công ty không tìm thấy thì bỏ qua (không link chết). Không còn lấy logo vuông từ `company.logoUrl` cho dải này.
- [ ] Hiển thị: bỏ khung ô vuông; `<img alt="<Tên công ty> logo" loading="lazy" height="32" width={width}>` (đủ width/height tránh layout shift); luôn hiện màu, hover nhích nhẹ (giữ như hiện tại, không grayscale); flex wrap căn giữa, gap 40–48px; mobile giữ marquee chậm hiện có, **dừng khi hover/focus**, tắt khi prefers-reduced-motion.
- [ ] Link có `aria-label` tên công ty đầy đủ; bản sao marquee vẫn `aria-hidden` + `tabIndex=-1`.
- [ ] Site không có dark mode → bỏ qua mục dark mode của brief.
- [ ] npm test, typecheck, next build xanh; production local + sweep 0 vấn đề; chụp dải logo 1440 và 390.
