# Brief: Nâng cấp trang chủ — nền, banner, khối còn thiếu (ticket 55)

Người dùng cung cấp ngày 2026-10-21. Giữ design system `white-blue-design-system.md` (v7). Nội dung gốc:

## Bối cảnh
Trang chủ hiện tại (header, hero tìm kiếm, "Vừa lên bảng tin", "Việc làm đang mở" + bộ lọc) đang toàn nền trắng phẳng, thiếu điểm nhấn và chiều sâu. Cần bổ sung nền và banner nhưng GIỮ NGUYÊN design system hiện có. Không đổi logic, API, routing hay dữ liệu.

## Design tokens bắt buộc (dùng biến CSS, không hard-code màu)
--bg #FFFFFF | --surface-muted #F0F9FF | --border #E5E7EB
--primary #0369A1 | --primary-hover #075985 | --primary-soft #E0F2FE | --accent #0EA5E9
--navy #0C1E2E (dùng cho tiêu đề và nền footer) | --text #334155 | --text-muted #64748B
Font Inter. Input/nút bo 12px, thẻ bo 16px, bóng nhiều lớp nhẹ, spacing bội số 4px.

## 1. Hero banner (ưu tiên cao nhất)
- Bọc hero hiện tại (badge "việc làm mới", tiêu đề, mô tả, ô tìm kiếm, chip từ khóa) trong một section có nền banner, cao khoảng 520–560px trên desktop.
- Nền: gradient xanh biển nhạt dần xuống trắng linear-gradient(180deg, #E0F2FE 0%, #F0F9FF 55%, #FFFFFF 100%).
- Thêm 2–3 khối blur trang trí (radial-gradient màu --accent và --primary, opacity 0.15–0.25, filter blur 80px) đặt lệch góc trên trái và phải. Dùng pointer-events: none.
- Thêm lớp họa tiết mờ: dot grid hoặc đường sóng SVG inline, opacity khoảng 0.06, mask-image fade dần xuống dưới.
- Ô tìm kiếm: nền trắng, bóng sâu hơn để nổi trên banner (0 1px 2px rgba(12,30,46,.06), 0 12px 32px rgba(3,105,161,.12)).
- Chip từ khóa: nền trắng/80% + backdrop-filter blur(8px), hover viền --accent.
- Dưới ô tìm kiếm thêm 1 hàng số liệu nhỏ: "241 việc làm · 120+ công ty · 63 tỉnh thành" (số đậm màu --primary, chữ --text-muted).
- Header: nền trắng 80% + backdrop-blur khi cuộn (sticky), border-bottom --border.

## 2. Dải logo công ty
- Ngay dưới hero: tiêu đề nhỏ "Được tin dùng bởi các nhà tuyển dụng" (style Label).
- 1 hàng logo công ty (lấy từ dữ liệu có sẵn), grayscale + opacity 0.6, hover thì hiện màu.
- Trên mobile chuyển thành cuộn ngang hoặc marquee chậm.

## 3. Sửa khối "Vừa lên bảng tin"
- Đặt section trên nền --surface-muted (#F0F9FF), padding dọc 64px, để tách khỏi hero.
- Carousel đang bị cắt thẻ ở mép phải và có vệt bóng mờ khó nhìn. Sửa bằng cách: thêm mask-image fade ở 2 mép, thêm nút mũi tên trái/phải (nút tròn trắng, bóng nhẹ) cạnh tiêu đề, bật scroll-snap.
- Thẻ đang có nhiều khoảng trống thừa: thêm logo công ty (40px, bo 10px) cạnh tiêu đề và 1 dòng lương/địa điểm. Bỏ khoảng trống dư phía trên tiêu đề.

## 4. Khối "Việc làm đang mở"
- Nền trắng, giữ bố cục sidebar lọc + lưới thẻ.
- Sidebar bộ lọc: sticky top 88px; chip đang chọn dùng --primary-soft + chữ --primary.
- Slider "Lương tối thiểu" hiện đang là style mặc định của trình duyệt. Custom lại: track cao 4px màu --border, phần đã chọn màu --primary, thumb tròn 18px nền trắng, viền 2px --primary, có bóng.
- Thẻ việc làm nổi bật: thêm viền trái 3px màu --accent hoặc nền gradient rất nhạt (#FFFFFF → #F0F9FF) để phân biệt với thẻ thường. Hover: translateY(-2px) + bóng sâu hơn.
- Lương hiển thị đậm màu --primary để dễ quét.

## 5. Banner CTA cho nhà tuyển dụng (khối mới, đặt sau danh sách việc làm)
- Thẻ rộng full container, bo 24px, nền gradient linear-gradient(135deg, #075985 0%, #0369A1 50%, #0EA5E9 100%).
- Thêm họa tiết sóng SVG trắng opacity 0.1 ở góc phải.
- Bên trái: tiêu đề trắng "Bạn đang tuyển dụng?", mô tả 1 dòng trắng 80%.
- Bên phải: nút trắng chữ --primary "Đăng tin miễn phí" + nút viền trắng "Tìm hiểu thêm".

## 6. Khối "Cẩm nang nghề nghiệp" (tùy chọn, nếu đã có dữ liệu bài viết)
- Nền --surface-muted, 3 thẻ bài viết có ảnh thumbnail tỉ lệ 16:9 bo 12px.

## 7. Footer (hiện chưa có)
- Nền --navy (#0C1E2E), chữ #CBD5E1, link hover thành trắng.
- 4 cột: Logo + mô tả ngắn | Ứng viên | Nhà tuyển dụng | Liên hệ.
- Dải dưới cùng: copyright, border-top rgba(255,255,255,.08).

## Yêu cầu kỹ thuật
- Mọi họa tiết nền viết bằng CSS/SVG inline, không tải ảnh ngoài.
- Responsive: mobile gutter 16px, không cuộn ngang trang; hero cao tự động trên mobile.
- Tôn trọng prefers-reduced-motion (tắt marquee và animation).
- Độ tương phản chữ đạt chuẩn WCAG AA, nhất là chữ trên nền gradient.
- Tách thành component riêng: HeroBanner, LogoStrip, EmployerCTA, Footer.
- Sau khi xong: chụp màn hình desktop (1440px) và mobile (390px) để tự kiểm tra.
