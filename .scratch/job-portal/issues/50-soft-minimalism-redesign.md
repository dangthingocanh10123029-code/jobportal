# 50: Redesign "Soft Minimalism" — trang chủ + design system toàn site

**What to build:** Áp brief `docs/design/soft-minimalism-brief.md` (người dùng cung cấp) cho Job Portal. Trang chủ `/` làm lại theo đúng bố cục brief, dùng dữ liệu thật; toàn site đổi sang bảng màu, font, hình dạng, bóng của brief (thay design system ticket 34). Giao diện vẫn tiếng Việt.

**Blocked by:** —

**Status:** ready-for-agent

## Quyết định của Coordinator (áp brief vào dự án)
- `[BRAND NAME]` = **Job Portal**. Mọi chữ hiển thị bằng tiếng Việt, viết hoa kiểu câu.
- **Font:** dùng `next/font/google` (có sẵn trong Next, không thêm dependency). Outfit KHÔNG có subset tiếng Việt → khai báo font stack `Outfit` + fallback có tiếng Việt (vd `Be Vietnam Pro`, subset `vietnamese`) để dấu (ạ, ế, ữ…) không vỡ; kiểm bằng ảnh chụp. Reenie Beanie không có dấu tiếng Việt → chỉ dùng cho **một từ không dấu hoặc dấu cơ bản đã kiểm hiển thị đúng**; nếu không có từ nào đẹp thì dùng font viết tay có tiếng Việt (vd `Patrick Hand`, subset vietnamese). Ghi lựa chọn vào ticket.
- **Màu:** cập nhật token trong `globals.css` theo brief: `--color-primary` #06B6D4 (nền nút / điểm nhấn), thêm `--color-primary-ink` #0E7490 (mọi chữ màu cyan, link), chữ #0B0F19 / #111827 / #4B5563 / #6B7280, viền #E7E5E4 / #F5F5F4, dark stone #292524. KHÔNG đặt chữ #06B6D4 trên nền trắng. Nút cyan dùng chữ #111827. Màu trạng thái (success/danger) giữ nhưng phải đạt 4.5:1.
- **Toàn site:** header thành thanh pill nổi (sticky, cách top 16px, nền trắng 70% + blur 20px). Desktop rộng hơn 760px nếu cần vì Candidate/Employer có nhiều mục, giữ menu gọn dưới 1240px như hiện tại. Nút, ô nhập, chip bo pill; card bo 24px–2rem; bóng theo brief; grain overlay cố định (pointer-events none, `aria-hidden`); tôn trọng `prefers-reduced-motion`; focus ring 2px #111827, offset 3px.
- **Trang chủ, map sang tính năng thật:**
  - Hero: badge "[N] việc làm mới tuần này" = số tin PUBLISHED tạo trong 7 ngày (lấy từ API hiện có; nếu cần endpoint đếm thì dùng `listOpenPostings` total với bộ lọc phù hợp hoặc báo Coordinator, KHÔNG bịa số). Ô tìm kiếm 2 trường (từ khóa, địa điểm) → `/?q=&location=` như cũ. Chip tìm kiếm phổ biến: lấy từ ngành/kỹ năng có thật.
  - "Việc mới đăng": cuộn ngang, tin mới nhất thật ("Đăng 2 giờ trước" tính từ createdAt).
  - "Duyệt & lọc": danh sách + bộ lọc hiện có (giữ mọi tham số URL, phân trang, tin nổi bật, gợi ý cho Candidate, nút tạo job alert) nhưng trình bày theo brief (panel lọc trái 280px, chip loại hình, khoảng lương, cấp bậc dạng pill).
  - "Cách hoạt động": 3 thẻ Tìm → Lưu → Ứng tuyển (mock tĩnh, không số liệu).
  - "Công ty hàng đầu": công ty thật có nhiều tin đang mở (logo, tên, số tin).
  - "Câu chuyện" dạng nhật ký: dùng **đánh giá công ty đã duyệt (ticket 45)**, đó là dữ liệu thật trong hệ thống, hiển thị tên tác giả theo đúng quy tắc ẩn danh. KHÔNG bịa lời chứng thực.
  - FAQ: câu hỏi về cách dùng nền tảng (nộp CV, CV online, job alert, bảo mật thông tin, thanh toán giả lập…), không có số liệu bịa.
  - "Nhận việc làm phù hợp" (conversion): Candidate đăng nhập → form tạo job alert (dùng `createJobAlertAction`, nhập từ khóa); khách → nút/ô dẫn tới `/signup?next=/candidate/alerts`. Không thu email cho tính năng không tồn tại.
  - Footer: Giới thiệu, Bảo mật, Liên hệ, Nhà tuyển dụng (trỏ trang có thật hoặc `/guide`, `/signup`). "Lương" trên nav → `/guide?category=SALARY`; "Đăng tin" → `/employer/postings/new`.
- KHÔNG tạo `loading.tsx` trong route có searchParams/route động. E2E hiện có dựa vào nhãn/role (vd "Danh sách việc làm đang mở", "Trang sau →", link `Xem …`): giữ nguyên tên truy cập, hoặc nếu buộc đổi thì báo rõ trong worker_done.

## Phần B — giao diện (Claude, worktree agent-codex) — branch `task/50-soft-minimalism`
- [ ] Token + font + header + nền chung (grain, blobs chỉ ở trang chủ và khối conversion)
- [ ] Trang chủ đủ 9 khối theo brief, mobile-first (360px không cuộn ngang ngoài khối "Việc mới đăng")
- [ ] Các trang khác vẫn đẹp và nhất quán với token mới (rà nhanh: jobs/[id], companies, đăng nhập/đăng ký, candidate/*, employer/*, admin/*, guide)
- [ ] Độ tương phản ≥ 4.5:1, focus ring rõ, label cho mọi input
- [ ] npm test, typecheck, next build xanh; chụp ảnh màn hình trang chủ desktop 1280 + mobile 360 (Playwright ngoài repo) đính kèm đường dẫn trong worker_done

## Hình ảnh
- Antigravity (ticket 39/48) đổi bảng màu sang cyan #06B6D4 + tint #CFFAFE / #E6E6FA / #E8EFE8 / #EFEDF4 + dark stone #292524.
