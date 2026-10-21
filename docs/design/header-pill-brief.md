# Brief: thiết kế lại header (ticket 56)

Người dùng cung cấp ngày 2026-10-21. Người dùng chọn: **lấy hình dáng, giữ màu xanh** — giữ tên Job Portal, logo và bảng màu v7, nền trang vẫn trắng; chỉ đổi header. Phần màu hồng/kem, tên "Softly.", menu Features/Manifesto/Stories của brief KHÔNG áp dụng.

Tóm tắt phần hình dáng được áp dụng:
- Thanh ngang trên cùng, rộng ~90–92% viewport, căn giữa, cao 58–64px, nền trắng, `border-radius: 9999px`, cách mép trên 10–14px, bóng rất nhẹ hoặc viền mờ.
- Trái: logo + tên thương hiệu cùng hàng, căn giữa dọc.
- Giữa: menu ngang, 12–14px, màu xám đậm, khoảng cách 24–32px, không underline; hover chữ đậm hơn, chuyển mượt.
- Phải: nút CTA dạng viên thuốc, nền gần đen, chữ trắng, cao 34–38px, padding ngang 20–24px, 12–13px / 600; hover nền xám đậm, transition nhẹ.
- Minimalist, premium, khoảng trắng rộng; không gradient nổi bật, không bóng đậm. Font Inter.
- Responsive: desktop logo trái / menu giữa / CTA phải; tablet giảm khoảng cách menu; mobile logo trái + CTA hoặc hamburger phải, menu ngang ẩn vào hamburger; không tràn ngang.
- Component Header riêng, Flexbox 3 vùng, không đổi các thành phần khác; theo design system/quy ước hiện có.
