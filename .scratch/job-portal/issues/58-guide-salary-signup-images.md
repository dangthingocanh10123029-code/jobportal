# 58: Ảnh bìa riêng từng bài cẩm nang/lương, banner trang Cẩm nang theo chủ đề, banner trang Đăng ký

**What to build:** Người dùng: "tiếp tục tới ảnh của bên bản tin của lương và bên cẩm nang và banner của đăng kí tạo tài khoản". Hiện 15 bài dùng chung 5 ảnh bìa theo chủ đề (`articles.cover_image` là cột generated theo category), đầu trang `/guide` (kể cả `/guide?category=SALARY` — mục "Lương" trên menu) chỉ là khung chữ không ảnh, trang `/signup` dùng chung `auth.webp` với `/login`.

**Blocked by:** —

**Status:** open

## Phần A — Antigravity (hình ảnh) — branch `task/58-a-guide-images`
Phong cách: minh họa phẳng hiện đại có chiều sâu nhẹ, bảng màu v7 (`docs/design/white-blue-design-system.md`: #0369A1, #0EA5E9, #E0F2FE, #F0F9FF, #0C1E2E, #334155, nền trắng; được thêm tối đa 1 màu nhấn ấm cho mỗi ảnh). **KHÔNG chữ, KHÔNG con số/mức lương/tên công ty/logo thật** trong ảnh (phiếu lương, biểu đồ chỉ là khối/vạch tượng trưng).
- [ ] 15 ảnh bìa riêng `public/images/articles/<slug>.webp` 1200×630, ≤ 120 KB, minh họa đúng nội dung từng bài (bảng dưới). 3 bài SALARY phải khác nhau rõ (phiếu lương gross/net · bắt tay nhận offer · tra cứu mặt bằng lương). Giữ nguyên 5 file `<category>.svg` làm ảnh dự phòng cho bài mới.
- [ ] 6 banner đầu trang Cẩm nang `public/images/guide/hero-<key>.webp` 1600×480, ≤ 160 KB, key: `all`, `cv`, `interview`, `salary`, `career`, `workplace`. Bố cục: nửa trái nhẹ/trống (chữ tiêu đề HTML đè lên), hình minh họa dồn sang phải. `salary` = chủ đề lương thưởng (ví, phiếu lương tượng trưng, đồng xu, biểu đồ cột không số).
- [ ] `public/images/signup.webp` 800×1000, ≤ 150 KB: banner trang Đăng ký — chào mừng người mới, gợi cả 2 vai trò (người tìm việc với CV/hồ sơ và nhà tuyển dụng với tin tuyển dụng), người minh họa phẳng đa dạng (không ảnh chụp người thật). Khác hẳn `auth.webp` (trang Đăng nhập giữ nguyên).
- [ ] Kiểm kích thước/dung lượng bằng script; tự xem từng ảnh. Chỉ sửa `public/images/**`. `npm run build` xanh. worker_done kèm commit hash + 1 ảnh lưới (contact sheet) toàn bộ ảnh mới.

| slug | category | title |
|---|---|---|
| chuyen-nganh-an-toan | CAREER | Chuyển ngành an toàn: làm sao đổi nghề mà không đánh cược tất cả |
| hoc-ky-nang-moi-va-xay-dung-thuong-hieu-ca-nhan | CAREER | Học kỹ năng mới và xây dựng thương hiệu cá nhân |
| lap-ke-hoach-phat-trien-nghe-nghiep-3-nam | CAREER | Lập kế hoạch phát triển nghề nghiệp trong 3 năm |
| toi-uu-cv-va-thu-xin-viec-theo-tin-tuyen-dung | CV | Tối ưu CV và thư xin việc theo từng tin tuyển dụng |
| viet-cv-cho-nguoi-moi-ra-truong | CV | Viết CV cho người mới ra trường: bắt đầu từ đâu khi chưa có kinh nghiệm |
| viet-muc-kinh-nghiem-bang-so-lieu | CV | Viết mục kinh nghiệm bằng số liệu để CV thuyết phục hơn |
| chuan-bi-truoc-buoi-phong-van | INTERVIEW | Chuẩn bị trước buổi phỏng vấn: danh sách việc cần làm trong 3 ngày |
| phong-van-online-va-cau-hoi-nen-hoi-lai | INTERVIEW | Phỏng vấn online và những câu nên hỏi lại nhà tuyển dụng |
| tra-loi-cau-hoi-hanh-vi-theo-mo-hinh-star | INTERVIEW | Trả lời câu hỏi hành vi theo mô hình STAR |
| hieu-phieu-luong-gross-net-bao-hiem-thue | SALARY | Hiểu phiếu lương: lương gross, lương net, bảo hiểm và thuế thu nhập cá nhân |
| thuong-luong-luong-khi-nhan-offer | SALARY | Thương lượng lương khi nhận offer: chuẩn bị, trao đổi và chốt lại |
| tim-hieu-muc-luong-thi-truong-truoc-khi-thuong-luong | SALARY | Tìm hiểu mức lương thị trường trước khi thương lượng |
| can-bang-cong-viec-cuoc-song-lam-viec-tu-xa-hybrid | WORKPLACE | Cân bằng công việc và cuộc sống khi làm việc từ xa hoặc hybrid |
| giao-tiep-va-phan-hoi-voi-quan-ly-dong-nghiep | WORKPLACE | Giao tiếp và phản hồi hiệu quả với quản lý và đồng nghiệp |
| hoa-nhap-90-ngay-dau-o-cong-ty-moi | WORKPLACE | 90 ngày đầu ở công ty mới: lộ trình hòa nhập từng bước |

## Phần B — giao diện (Claude, worktree agent-codex) — chờ Phần A — branch `task/58-b-guide-images`
- [ ] Ảnh bìa: map tĩnh `src/components/articles/covers.ts` (Set các slug có ảnh riêng) → `/images/articles/<slug>.webp`, slug không có thì dùng `cover_image` từ API như cũ. Áp ở danh sách cẩm nang, trang chi tiết bài, khối cẩm nang trang chủ. Bỏ `onError`/client state của `ArticleCover` nếu không còn cần (ghi chú ponytail cũ đã hết hạn) → server component.
- [ ] Banner đầu `/guide`: `.guide-hero` có ảnh `hero-<category|all>.webp` theo chủ đề đang lọc (nền ảnh phía phải hoặc `<img>` absolute, chữ + ô tìm kiếm vẫn đọc rõ, tương phản ≥ 4.5:1; mobile ảnh co/ẩn bớt, không tràn ngang). Tiêu đề phụ đổi theo chủ đề nếu đang lọc (vd SALARY: "Lương thưởng").
- [ ] `/signup` dùng `signup.webp`, `/login` giữ `auth.webp` (vd modifier class `.auth-image-signup`).
- [ ] `<img>` có width/height, `alt=""` vì trang trí; ảnh bìa trên trang chi tiết có thể `fetchPriority="high"`.
- [ ] npm test, typecheck, next build xanh; production local + sweep 0 vấn đề; chụp /guide, /guide?category=SALARY, 1 bài lương, /signup ở 1440 + 390.
