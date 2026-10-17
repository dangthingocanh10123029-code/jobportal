# 34: Làm lại giao diện toàn site (mạnh tay) theo brief Layered & Depth

**What to build:** Ticket 30 chỉ áp brief ở mức token/CSS nên khác biệt chưa rõ. Người dùng chọn "làm mạnh tay toàn site": redesign rõ rệt bố cục và phân cấp thị giác theo brief, giữ nguyên chức năng, route, contract.

> Brief: đổ bóng đa lớp + viền #E5E7EB cho thẻ; tăng khoảng trắng giữa khu vực chức năng; ô nhập/bộ lọc bo 12px, tương tác mượt; nút Primary có elevation nhẹ; tiêu đề tương phản cao, tối ưu letter-spacing để quét dữ liệu nhanh; nền trắng #FFFFFF xuyên suốt.

**Blocked by:** 30

**Status:** resolved

- [ ] Design system tách ra `src/app/styles/` (tokens, base, components, utilities) hoặc giữ `globals.css` nhưng có mục rõ ràng; component dùng chung trong `src/components/ui/` (Button, Card, Input/Select, Badge, StatCard, EmptyState, PageHeader) — các trang dùng lại thay vì lặp class
- [ ] Header: dính khi cuộn, nền trắng + viền dưới mảnh, logo/menu/khu tài khoản cân đối; mobile có menu gọn
- [ ] Trang chủ: hero gọn hơn, **thanh tìm kiếm chính** (từ khóa + địa điểm + nút) nổi lên trên, bộ lọc nâng cao thu gọn/mở rộng, chip ngành; danh sách tin dạng thẻ có phân cấp rõ (tiêu đề đậm, công ty + huy hiệu, meta một dòng, lương nổi bật, kỹ năng chip), hover nâng nhẹ
- [ ] Trang chi tiết tin: **hai cột** (nội dung trái; cột phải dính: lương, hạn nộp, nút Ứng tuyển/Lưu, thông tin công ty); mobile một cột với thanh hành động dính đáy
- [ ] Trang công ty, danh sách công ty: header công ty có logo lớn, số liệu, giới thiệu; lưới thẻ công ty
- [ ] Khu Employer/Candidate (tin của tôi, đơn, dashboard, hồ sơ, thông báo): bố cục kiểu SaaS — PageHeader + StatCard + bảng/thẻ thống nhất, trạng thái bằng Badge màu theo token
- [ ] Form (đăng tin, hồ sơ, đăng nhập/đăng ký): nhóm trường thành section có tiêu đề, nhãn rõ, trợ giúp dưới ô, lỗi inline; trang đăng nhập/đăng ký hai cột với ảnh `auth.webp`
- [ ] Trạng thái rỗng/đang tải: skeleton cho danh sách (`loading.tsx` ở các route chính) — cảm giác nhanh hơn
- [ ] Khả năng truy cập: tương phản AA, focus ring rõ, vùng chạm ≥ 44px, `prefers-reduced-motion`; không tràn ngang 360px
- [ ] Chụp trước/sau 1280px + 360px cho: `/`, `/jobs/[id]`, `/companies/[id]`, `/employer/postings`, `/employer/dashboard`, `/candidate/applications`, `/login` (đường dẫn ảnh trong worker_done)
- [ ] npm test + typecheck xanh; không đổi nội dung nghiệp vụ, không đổi selector mà E2E dựa vào (name của input, nhãn nút chính: 'Đăng nhập', 'Lưu bản nháp', 'Đăng tin', 'Nộp hồ sơ', 'Xem hồ sơ', 'Tải CV', 'Rút hồ sơ', 'Lưu hồ sơ', 'Lưu thay đổi', 'Tải logo lên', 'Đánh dấu tất cả đã đọc', 'Trang sau →', aria-label chuông 'Thông báo, N chưa đọc', aria-label nút lưu 'Lưu việc làm'/'Bỏ lưu') — nếu buộc đổi thì liệt kê trong worker_done

## Phân công (Orca)
- **Codex:** toàn bộ ticket (`src/app/**`, `src/components/**`, CSS). Cần ảnh mới thì gửi question cho Coordinator (Antigravity).
