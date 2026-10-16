# 03: Xem danh sách và chi tiết Job Posting đang mở

**What to build:** Ai cũng xem được danh sách tin đang mở (PUBLISHED và chưa hết hạn), mới nhất trước, phân trang 20 tin. Trang chi tiết hiển thị tên công ty và mô tả đầy đủ; tin Expired hoặc CLOSED vẫn mở được nhưng báo không nhận đơn; tin DRAFT trả 404. Spec: user stories 13, 16, 17, 18.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] Bổ sung vào `JobPostingService` hàm liệt kê tin đang mở và lấy chi tiết; điều kiện "đang mở" gom một chỗ (view hoặc hàm SQL dùng chung, ADR-0001)
- [ ] Test: tin DRAFT, CLOSED, Expired không có trong danh sách; phân trang đúng
- [ ] Trang chủ hiển thị danh sách tin đang mở, trang chi tiết tin
- [ ] `npm test` và `npm run typecheck` xanh

## Phân công (Orca)

Contract: `docs/api-contract.md`, mục ticket 03.

- **Phần A — Claude (logic, worktree `agent-claude-logic`):** `listOpenPostings` (chỉ `page`), `getPostingDetail`, điều kiện "đang mở" dùng chung (ADR-0001), test.
- **Phần B — Codex (giao diện, worktree `agent-codex`, sau khi Phần A merge):** trang chủ `/` danh sách tin + phân trang, trang `/jobs/[id]`, thông báo khi tin Expired/CLOSED, 404 cho DRAFT.
