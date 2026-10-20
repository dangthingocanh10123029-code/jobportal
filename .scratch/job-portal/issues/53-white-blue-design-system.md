# 53: Design system "Trắng & Xanh biển" + icon toàn site

**What to build:** Áp `docs/design/white-blue-design-system.md` (người dùng cung cấp) cho TOÀN BỘ giao diện, thay design system v6 Soft Minimalism (ticket 50). Đồng thời thay mọi "icon" đang là ký tự Unicode (▦ ♙ ▤ ⌂ ◷ ▧ ★ ◆ ₫ ☰ …) bằng icon thật từ `lucide-react` (Coordinator đã thêm dependency, 0.468.0) và bổ sung icon ở những chỗ giúp đọc nhanh.

**Blocked by:** —

**Status:** open

## Quyết định của Coordinator
- **Token:** khai báo đúng tên biến của brief trong `:root` (`--bg`, `--surface-muted`, `--border`, `--border-strong`, `--primary`, `--primary-hover`, `--primary-soft`, `--accent`, `--ring`, `--text-strong`, `--text`, `--text-muted`, `--success`, `--warning`, `--danger`). Các biến cũ (`--color-*`) map sang biến mới hoặc xóa hẳn; component không hard-code mã màu (thay mọi `#…`/`rgb(…)` lẻ trong CSS component bằng biến; ngoại lệ duy nhất là giá trị bóng ghi trong brief).
- **Font:** `next/font/google` Inter (subset `latin`, `vietnamese`), fallback Be Vietnam Pro, system-ui. Bỏ Outfit và Patrick Hand (chữ viết tay) vì không có trong brief.
- **Hình dạng:** bỏ kiểu pill của v6. Nút/input/select/chip bộ lọc bo 12px, cao 40px; thẻ bo 16px, padding 24px, bóng 3 lớp của brief. Badge trạng thái có thể bo tròn hoàn toàn (badge không phải control), nền `--primary-soft` cho badge thông tin.
- **Nền:** trắng xuyên suốt. Bỏ grain overlay, blob, nền tint/xám của v6. Chiều sâu chỉ từ bóng + viền.
- **Header:** thanh trắng full-width, sticky top 0, border-bottom 1px `--border` (bỏ thanh pill nổi). Giữ cơ chế gom menu khi hẹp (đã sửa tràn ngang 1280px ở commit 6473199: không được tràn ngang ở 375/1280/1440).
- **Bảng:** áp đúng mục "Bảng dữ liệu" cho mọi bảng (admin users/postings/companies/audit/orders/packages, dashboard employer). Cột số căn phải, tabular-nums.
- **1 nút Primary mỗi khu vực:** rà các form/toolbar, nút phụ đổi sang Secondary/Ghost.
- **Trang chủ:** giữ cấu trúc khối và dữ liệu thật của ticket 50 (badge tin mới 7 ngày, việc mới đăng, duyệt & lọc, công ty hàng đầu, câu chuyện từ review đã duyệt, FAQ, conversion job alert) nhưng trình bày theo design system mới (bỏ chữ viết tay, khối màu tint).
- **Icon (`lucide-react`):**
  - Dùng `import { Briefcase } from 'lucide-react'` (named import, tree-shake). Kích thước 16 (trong nút/badge/menu) hoặc 20 (stat card/sidebar), `strokeWidth={1.75}`, màu `currentColor`; icon thuần trang trí có `aria-hidden="true"`; nút chỉ có icon phải có `aria-label`.
  - Bắt buộc: sidebar admin (thay ký tự Unicode), stat card admin + dashboard employer, header (chuông, tin nhắn, menu mobile, tài khoản, đăng xuất), nav có thể thêm icon trong menu mobile, nút hành động chính (Ứng tuyển, Lưu tin, Đăng tin, Tạo đơn, Thanh toán, Xuất PDF…), meta tin tuyển dụng (địa điểm MapPin, lương Wallet/Banknote, loại hình Clock, kinh nghiệm/cấp bậc), lịch phỏng vấn (Calendar/Video/MapPin), tin nhắn (Send), đánh giá (Star thay ★), tin nổi bật (huy hiệu dùng icon hoặc `featured-badge.svg` của Antigravity), empty state giữ ảnh SVG.
  - Icon ngành nghề (`public/images/industries/*.svg`) do Antigravity vẽ lại ở ticket 54, giữ nguyên tên file.
- **Không đổi tên truy cập** mà E2E dùng (nhãn, role, "Danh sách việc làm đang mở", "Trang sau →", "Ứng tuyển: …", "Job Portal, trang chủ", "Thanh toán (giả lập)"…). Nếu buộc đổi, ghi rõ trong worker_done.
- KHÔNG tạo `loading.tsx` trong route có searchParams/route động.
- Độ tương phản ≥ 4.5:1 (#0369A1 trên trắng đạt ~5.9:1; KHÔNG dùng `--accent` #0EA5E9 làm màu chữ trên nền trắng vì chỉ ~2.8:1, chỉ cho icon/biểu đồ/focus ring/viền). Focus ring: border `--accent` + `0 0 0 4px var(--ring)` cho control; link/nút thêm outline nhìn thấy được.

## Phần B — giao diện (Claude, worktree agent-codex) — branch `task/53-white-blue`
- [ ] Token, font Inter, typography H1–H3/body/label, card, control, button, bảng
- [ ] Header + footer + admin layout theo design system mới
- [ ] Thay toàn bộ ký tự Unicode làm icon bằng lucide-react; thêm icon theo danh sách trên
- [ ] Rà mọi trang (guest, candidate, employer, admin): `node .scratch/job-portal/e2e/sweep.mjs` với `E2E_BASE` trỏ bản local production (`next build && next start`) phải 0 vấn đề; chụp màn hình trang chủ, 1 trang candidate, 1 trang employer, admin tổng quan (1280 + 375) và gửi đường dẫn trong worker_done
- [ ] Không còn mã màu hard-code trong CSS ngoài `:root` và bóng của brief (`grep -nE '#[0-9a-fA-F]{3,8}' src/app/globals.css` chỉ còn ở `:root`/bóng)
- [ ] npm test, npm run typecheck, next build xanh

## Hình ảnh
- Ticket 54 (Antigravity) vẽ lại bộ ảnh theo bảng màu v7.
