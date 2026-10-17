# 19: Hình ảnh v2

**What to build:** 24 logo công ty hư cấu, 16 icon ngành nghề, 2 minh họa trạng thái rỗng theo bảng 'Hình ảnh v2' trong `docs/api-contract.md`.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Đủ file, đúng tên/đường dẫn/kích thước trong contract
- [ ] Logo: trừu tượng, không chữ, không giống thương hiệu có thật, đa dạng màu nhưng hài hòa với bảng màu chung
- [ ] Icon ngành: nét đơn, `currentColor`, nhận ra được ở 24px
- [ ] SVG không nhúng raster; `npm run build` xanh
- [ ] `npm test` và `npm run typecheck` xanh

## Phân công (Orca)

- **Antigravity (hình ảnh, worktree `agent-antigravity`):** toàn bộ ticket.
