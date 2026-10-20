# 54: Vẽ lại bộ ảnh theo bảng màu "Trắng & Xanh biển" (v7)

**What to build:** Toàn bộ ảnh trong `public/images/**`, `src/app/icon.png`, `src/app/opengraph-image.png` đang theo bảng cyan v6 (ticket 39/48). Vẽ lại theo bảng màu v7 trong `docs/design/white-blue-design-system.md`: chủ đạo #0369A1, accent #0EA5E9, soft #E0F2FE / #F0F9FF, chữ/nét đậm #0C1E2E / #334155, nền trắng. Phong cách: phẳng, sạch, chuyên nghiệp, có chiều sâu nhẹ (bóng mềm, lớp chồng), tối đa 4 màu/ảnh. **Giữ nguyên tên file, kích thước, dung lượng tối đa** (xem ticket 39, 48 và `docs/api-contract.md`) để không phải sửa code.

**Blocked by:** —

**Status:** open

### Antigravity — branch `task/54-white-blue-assets`
- [ ] Logo `logo.svg`, `logo-mark.svg`, `src/app/icon.png` (512×512), `src/app/opengraph-image.png` (1200×630, chỉ logo + "Tìm việc nhanh, ứng tuyển dễ", KHÔNG bịa số liệu, tên công ty, domain, lương)
- [ ] `hero.webp` (1600×600, ≤ 200 KB), `auth.webp` (800×1000, ≤ 150 KB), `guide-hero.webp` (1600×500, ≤ 200 KB)
- [ ] `company-placeholder.svg`, `not-found.svg`, mọi `empty-*.svg` (giữ kích thước gốc của từng file)
- [ ] `companies/logo-01..24.svg` (128×128, trừu tượng, không chữ, không giống thương hiệu thật)
- [ ] `industries/*.svg` (16 file, 48×48): **icon nét đơn sắc `stroke="currentColor"`, `fill="none"`, stroke-width 1.75, đầu nét tròn**, cùng ngôn ngữ với icon lucide (ticket 53) để đứng cạnh nhau đồng bộ
- [ ] `avatars/avatar-01..12.svg` (96×96, người minh họa phẳng, đa dạng, nền tròn màu trong bảng v7)
- [ ] `articles/*.svg` (1200×630, không chữ), `featured-badge.svg` (24×24)
- [ ] SVG gọn (có viewBox, không raster nhúng, không script). Chỉ sửa `public/images/**`, `src/app/icon.png`, `src/app/opengraph-image.png`. `npm run build` xanh. Commit, worker_done kèm danh sách file
