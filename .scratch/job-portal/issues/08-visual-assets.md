# 08: Bộ hình ảnh nhận diện và minh họa

**What to build:** Toàn bộ hình ảnh cho giao diện v1 — logo, favicon, ảnh Open Graph, ảnh hero trang chủ, ảnh trang đăng nhập/đăng ký, ảnh thay logo công ty, minh họa cho các trạng thái trống và trang 404 — đặt đúng đường dẫn, kích thước và bảng màu trong `docs/api-contract.md` mục "Hình ảnh".

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Đủ 11 file theo bảng trong `docs/api-contract.md`, đúng tên và đường dẫn
- [ ] Dùng đúng bảng màu chung, phong cách thống nhất giữa các minh họa
- [ ] WebP đúng kích thước và dưới giới hạn dung lượng; SVG không nhúng ảnh raster
- [ ] Minh họa không chứa chữ (trừ logo và ảnh Open Graph)
- [ ] Logo đọc rõ ở chiều cao 32px và favicon nhận ra được ở 16px
- [ ] Không sửa file ngoài `public/images/**`, `src/app/icon.png`, `src/app/opengraph-image.png`
- [ ] `npm run build` thành công

## Phân công (Orca)

- **Antigravity (hình ảnh, worktree `agent-antigravity`):** toàn bộ ticket. Không tách Phần A/B.
