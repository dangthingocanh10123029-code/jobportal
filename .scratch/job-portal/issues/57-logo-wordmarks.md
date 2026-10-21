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


## Bổ sung (2026-10-21): logo riêng cho TẤT CẢ 40 công ty trong hệ thống
Người dùng: "thay đổi logo công ty trong hệ thống phải khác đi". Hiện 40 công ty dùng chung 24 logo trừu tượng `logo-01..24.svg` (trùng nhau, không liên quan tên).

### Phần A bổ sung — Antigravity (cùng branch `task/57-a-logo-wordmarks`)
- [ ] `public/images/companies/<slug>.svg` × 40 (bảng dưới): logo VUÔNG 128×128 (`viewBox="0 0 128 128"`), là **biểu tượng của chính thương hiệu đó** (gợi đúng tên: Ống Heo → heo đất, Cánh Buồm → cánh buồm, Cán Cân → cán cân, Tiếng Chuông → chuông…), nền bo góc màu thương hiệu hoặc nền trắng + biểu tượng màu; KHÔNG chữ.
- [ ] 40 logo phải **khác nhau rõ rệt** (hình, màu chủ đạo, kiểu nền), không lặp mẫu; mỗi logo 1–3 màu; không mô phỏng logo công ty thật.
- [ ] 10 công ty có logo ngang (`public/logos/<slug>.svg`) dùng **cùng biểu tượng và màu** với logo vuông của nó.
- [ ] Giữ nguyên `logo-01..24.svg` và `company-placeholder.svg` (logo người dùng chưa tải lên vẫn dùng).
- [ ] worker_done kèm 1 ảnh lưới (contact sheet) 40 logo để Coordinator duyệt.

### Coordinator
- Sau khi duyệt: cập nhật `supabase/seed/seed-demo.sql` và chạy `.scratch/job-portal/company-logos-update.sql` lên DB SG (chỉ đổi logo seed `logo-NN`, không đụng logo do Employer tự tải lên).

| slug | Thương hiệu | companies.name |
|---|---|---|
| muoi-phuong | Mười Phương | Công ty Cổ phần Chuỗi Nhà thuốc Mười Phương |
| may-bac | Mây Bạc | Công ty Cổ phần Công nghệ Mây Bạc |
| bai-boi | Bãi Bồi | Công ty Cổ phần Địa ốc Bãi Bồi |
| ban-tron | Bàn Tròn | Công ty Cổ phần Dịch vụ Văn phòng Bàn Tròn |
| luc-lam | Lục Lam | Công ty Cổ phần Dữ liệu Lục Lam |
| cay-bang | Cây Bàng | Công ty Cổ phần Giáo dục Cây Bàng |
| hat-mam-xanh | Hạt Mầm Xanh | Công ty Cổ phần Giáo dục Hạt Mầm Xanh |
| canh-buom | Cánh Buồm | Công ty Cổ phần Giao vận Cánh Buồm |
| ruong-bac | Ruộng Bậc | Công ty Cổ phần Nông nghiệp Ruộng Bậc |
| truc-xanh | Trúc Xanh | Công ty Cổ phần Phân phối Trúc Xanh Miền Nam |
| mat-troi-hong | Mặt Trời Hồng | Công ty Cổ phần Quảng cáo Mặt Trời Hồng |
| hat-de | Hạt Dẻ | Công ty Cổ phần Thanh toán Hạt Dẻ |
| dong-que-ngot | Đồng Quê Ngọt | Công ty Cổ phần Thực phẩm Đồng Quê Ngọt |
| hai-dang | Hải Đăng | Công ty Cổ phần Trí tuệ Nhân tạo Hải Đăng |
| phu-sa | Phù Sa | Công ty Cổ phần Tư vấn Tài chính Phù Sa |
| mong-da | Móng Đá | Công ty Cổ phần Xây dựng Móng Đá |
| ngay-thang | Ngay Thẳng | Công ty Luật Hợp danh Ngay Thẳng |
| can-can | Cán Cân | Công ty Luật TNHH Cán Cân |
| ong-heo | Ống Heo | Công ty Tài chính Tiêu dùng Ống Heo |
| la-chan-xanh | Lá Chắn Xanh | Công ty TNHH An ninh Mạng Lá Chắn Xanh |
| canh-dieu | Cánh Diều | Công ty TNHH Bao bì Cánh Diều |
| hoa-anh-dao | Hoa Anh Đào | Công ty TNHH Biên phiên dịch Hoa Anh Đào |
| bep-me-nau | Bếp Mẹ Nấu | Công ty TNHH Chuỗi Nhà hàng Bếp Mẹ Nấu |
| luoi-thep | Lưới Thép | Công ty TNHH Cơ điện Lưới Thép |
| nha-vui | Nhà Vui | Công ty TNHH Điện máy Nhà Vui |
| doi-thong | Đồi Thông | Công ty TNHH Giải pháp Phần mềm Đồi Thông |
| hai-au-trang | Hải Âu Trắng | Công ty TNHH Khách sạn Hải Âu Trắng |
| ba-song | Ba Sông | Công ty TNHH Kho vận Ba Sông |
| minh-bach | Minh Bạch | Công ty TNHH Kiểm toán và Tư vấn Thuế Minh Bạch |
| dom-dom | Đom Đóm | Công ty TNHH Linh kiện Chính xác Đom Đóm |
| canh-cam | Cánh Cam | Công ty TNHH Nhân lực Cánh Cam |
| mai-ngoi | Mái Ngói | Công ty TNHH Nội thất Mái Ngói |
| cau-vong-so | Cầu Vồng Số | Công ty TNHH Phần mềm Cầu Vồng Số |
| co-ba-la | Cỏ Ba Lá | Công ty TNHH Phòng khám Đa khoa Cỏ Ba Lá |
| ngoc-lan | Ngọc Lan | Công ty TNHH Thiết bị Văn phòng Ngọc Lan |
| giay-xep | Giấy Xếp | Công ty TNHH Thiết kế Giấy Xếp |
| ro-tre | Rổ Tre | Công ty TNHH Thương mại Điện tử Rổ Tre |
| tieng-chuong | Tiếng Chuông | Công ty TNHH Trung tâm Liên lạc Tiếng Chuông |
| gio-nom | Gió Nồm | Công ty TNHH Truyền thông Gió Nồm |
| chim-se | Chim Sẻ | Công ty TNHH Ứng dụng Di động Chim Sẻ |
