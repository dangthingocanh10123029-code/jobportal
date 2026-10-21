# 55: Trang chủ — hero banner, dải logo, CTA nhà tuyển dụng, cẩm nang, footer 4 cột

**What to build:** Làm đúng `docs/design/homepage-banner-brief.md` (người dùng cung cấp) trên nền design system v7. Không đổi logic, API, routing, dữ liệu.

**Blocked by:** —

**Status:** open

## Quyết định của Coordinator
- **Hàng số liệu hero:** KHÔNG dùng số trong brief (241 / 120+ / 63 là ví dụ). Dùng số thật: "N việc làm" = `listOpenPostings({}).total`, "M công ty" = `listCompanies({}).total` (số chính xác, không làm tròn kiểu "120+"). Không có nguồn đếm tỉnh/thành → BỎ mục "tỉnh thành" (không ghi 63). Số định dạng `toLocaleString('vi-VN')`.
- **Token:** thêm `--navy: #0C1E2E` (alias cùng giá trị `--text-strong`). Màu trong gradient/blur/bóng của brief viết bằng biến (`var(--primary-soft)`, `var(--surface-muted)`, `var(--bg)`, `var(--primary-hover)`, `var(--primary)`, `var(--accent)`; độ trong suốt dùng `color-mix(in srgb, var(--primary) 12%, transparent)`), không hex lẻ ngoài `:root`. Chữ footer #CBD5E1 = `var(--border-strong)`.
- **Dải logo:** công ty thật có tin đang mở (dữ liệu sẵn có, vd từ `listCompanies` hoặc khối "Công ty hàng đầu"), logo thật hoặc `company-placeholder.svg`; mỗi logo là link tới `/companies/[id]` với `aria-label` tên công ty. Tiêu đề giữ "Được tin dùng bởi các nhà tuyển dụng". Marquee mobile tắt khi `prefers-reduced-motion` (khi đó cuộn ngang tay).
- **Vừa lên bảng tin:** nút mũi tên là client component nhỏ cuộn `scrollBy` theo chiều rộng thẻ, `aria-label="Cuộn trái"/"Cuộn phải"`, disable khi ở đầu/cuối. Logo 40px bo 10px + 1 dòng lương · địa điểm (dùng `formatSalary` sẵn có). Giữ link/tên truy cập hiện có.
- **Việc làm đang mở:** giữ nguyên mọi tham số URL, phân trang, label "Danh sách việc làm đang mở", "Trang sau →", "Ứng tuyển: …", slider vẫn là `<input type=range>` (chỉ đổi CSS, phần đã chọn dùng biến CSS `--fill` cập nhật theo value, phải đúng cả khi chưa hydrate: render server với giá trị ban đầu).
- **CTA nhà tuyển dụng:** "Đăng tin miễn phí" → `/employer/postings/new` (đăng tin thường miễn phí là đúng; tin nổi bật mới tính phí giả lập). "Tìm hiểu thêm" → `/employer/billing` nếu là Employer, còn lại `/guide`. Chữ trắng trên gradient: kiểm tương phản ở đầu sáng nhất (#0EA5E9 với chữ trắng chỉ ~2.8:1) → đặt chữ ở nửa trái tối, hoặc phủ lớp tối/đổi điểm dừng gradient sao cho mọi chữ trắng đạt ≥ 4.5:1 (chữ lớn ≥ 3:1). Ghi cách xử lý vào worker_done.
- **Cẩm nang:** có dữ liệu (ticket 46) → làm, 3 bài mới nhất, ảnh bìa `cover_image` sẵn có, link `/guide/[slug]`.
- **Footer:** đã có footer đơn giản → thay bằng footer 4 cột theo brief. Cột "Liên hệ": KHÔNG bịa số điện thoại/email/địa chỉ; chỉ đặt link trang có thật (vd "Hướng dẫn & hỗ trợ" → `/guide`, "Chính sách bảo mật"/"Giới thiệu" → trang đang được footer cũ trỏ tới). Giữ các tên link footer cũ mà E2E có thể dùng. Footer áp mọi trang (layout), không chỉ trang chủ; admin layout cũng dùng.
- **Header:** trắng 80% + blur, sticky, viền dưới (đã gần đúng sau ticket 53, chỉ chỉnh). Không được tràn ngang ở 375/1280/1440.
- Component tách riêng trong `src/components/home/`: `HeroBanner`, `LogoStrip`, `EmployerCTA`; footer `src/components/navigation/site-footer.tsx` (hoặc file footer hiện có).
- Không thêm dependency. Không tạo `loading.tsx`. Không ảnh ngoài.

## Phần B — giao diện (Claude, worktree agent-codex) — branch `task/55-homepage-banner`
- [ ] 7 mục của brief (mục 6 làm vì đã có dữ liệu)
- [ ] npm test, typecheck, next build xanh
- [ ] Bản production local + `sweep.mjs` 0 vấn đề
- [ ] Chụp trang chủ 1440 + 390 (khách và Candidate đăng nhập), 1 trang trong (vd /companies) để thấy footer; tự xem và sửa; gửi đường dẫn ảnh trong worker_done

## Bổ sung (2026-10-21): đồng nhất control sidebar bộ lọc — `docs/design/filter-controls-brief.md`
- Không dùng shadcn (dự án không có). Giữ `<select>` native (a11y, không thêm dependency), chỉ đổi CSS: appearance none + chevron SVG inline. Màu chevron qua biến: dùng `mask-image` trên pseudo-element của wrapper, hoặc 2 background-image (thường/focus) — chevron mặc định var(--text-muted), focus var(--primary); không hex lẻ ngoài `:root` (data-URI SVG được phép chứa màu nếu không làm được bằng biến, ghi chú lý do).
- Input number: ẩn spinner; KHÔNG thêm nút −/+ (phím mũi tên vẫn tăng/giảm; giữ gọn).
- Áp class chung cho mọi control trong sidebar (và nên dùng chung cho control toàn site nếu không vỡ trang khác; sweep phải 0 vấn đề).
- "Xóa bộ lọc": giữ là `<Link>` (E2E dùng role link "Xóa bộ lọc"), đổi style thành nút ghost full width dưới "Áp dụng bộ lọc"; giữ điều kiện chỉ hiện khi có bộ lọc.
- Chụp sidebar trước/sau (1440) vào scratchpad/e2e/t55/; nếu có Firefox/WebKit của Playwright thì chụp thêm, không có thì ghi rõ chỉ kiểm Chrome.
