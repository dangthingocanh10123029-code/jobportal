Status: in-progress
Type: AFK

# 39 — Làm lại toàn bộ hình ảnh (icon → avatar)

Người dùng đánh giá ảnh và icon hiện tại chưa đẹp. Làm lại toàn bộ bộ hình ảnh theo một phong cách thống nhất, đúng bảng màu và kích thước trong `docs/api-contract.md` (mục "Hình ảnh" + "Hình ảnh v2"). **Giữ nguyên tên file và kích thước** để không phải sửa code.

## Phần A (Antigravity — hình ảnh) — branch `task/39-a-visual-refresh`

Làm lại (ghi đè cùng đường dẫn):
- `public/images/logo.svg`, `public/images/logo-mark.svg`, `src/app/icon.png` (512×512), `src/app/opengraph-image.png` (1200×630, có logo + "Tìm việc nhanh, ứng tuyển dễ").
- `public/images/hero.webp` (1600×600, ≤ 200 KB), `public/images/auth.webp` (800×1000, ≤ 150 KB).
- `public/images/company-placeholder.svg`, `not-found.svg`, `empty-*.svg` (6 file).
- `public/images/companies/logo-01.svg … logo-24.svg` (128×128, trừu tượng, không chữ, không giống thương hiệu thật).
- `public/images/industries/*.svg` (16 file, 48×48, nét đơn sắc `currentColor`, cùng độ dày nét).

Thêm mới:
- `public/images/avatars/avatar-01.svg … avatar-12.svg`: avatar mặc định 96×96, hình người minh họa phẳng (không ảnh chụp người thật), đa dạng giới tính/kiểu tóc/màu da, nền tròn dùng màu trong bảng màu.

Yêu cầu chung:
- Phong cách: phẳng hiện đại, nét tròn, có chiều sâu nhẹ (layered & depth như redesign 34), tối đa 4 màu từ bảng màu, không chữ (trừ logo và OG).
- SVG gọn (không nhúng ảnh raster, không script), có `viewBox`.
- Chỉ sửa `public/images/**`, `src/app/icon.png`, `src/app/opengraph-image.png`.
- `npm run build` xanh. Commit, worker_done kèm danh sách file.

## Phần B (Codex — giao diện) — chờ Phần A

- Thay chữ cái đầu trong `.avatar-mark` (`src/app/account/page.tsx` và nơi khác hiện avatar) bằng `/images/avatars/avatar-NN.svg`, chọn ổn định theo `userId` (cùng người luôn cùng avatar), `alt=""` vì chỉ trang trí.
- Kiểm tra mọi trang vẫn hiển thị đúng kích thước ảnh mới (hero, auth, logo, empty state).
- `npm test`, `npm run typecheck` xanh.

## Chấp nhận
- [ ] Toàn bộ file trong danh sách được làm lại, đúng kích thước/dung lượng.
- [ ] 12 avatar mới hiển thị ở trang tài khoản.
- [ ] E2E vẫn 52/52.
