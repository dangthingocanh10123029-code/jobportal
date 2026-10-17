# 17: Thông báo + dashboard

**What to build:** Thông báo trong app khi có đơn mới, đổi trạng thái, rút đơn; Employer có dashboard lượt xem + đơn theo trạng thái. Spec: 38–39.

**Blocked by:** 16

**Status:** ready-for-agent

- [ ] Migration `20261017000400_*`: bảng `notifications` + RLS (chỉ chủ đọc/đánh dấu đã đọc), trigger trên `applications` insert và `application_status_changes` insert tạo thông báo đúng người nhận; cột/ bảng `posting_views` + RPC tăng lượt xem (security definer, không tính chủ tin)
- [ ] `@/actions/notifications`, `@/actions/dashboard` theo contract mục 17; `getPostingDetail` ghi lượt xem; test
- [ ] UI: chuông thông báo trên header có số chưa đọc, `/notifications` (đánh dấu đã đọc, link tới đơn), `/employer/dashboard` (thẻ tổng, biểu đồ cột đơn theo trạng thái bằng CSS, bảng tin với lượt xem/số đơn); menu Employer thêm Dashboard
- [ ] `npm test` và `npm run typecheck` xanh

## Phân công (Orca)

Contract: `docs/api-contract.md`, mục 17.

- **Phần A — Claude (logic, worktree `agent-claude-logic`):** migration + trigger + RPC, actions, test.
- **Phần B — Codex (giao diện, worktree `agent-codex`, sau khi Phần A merge):** chuông + trang thông báo, dashboard Employer.
