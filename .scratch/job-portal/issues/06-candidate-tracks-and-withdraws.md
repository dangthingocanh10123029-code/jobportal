# 06: Candidate theo dõi và rút Application

**What to build:** Trang "Đơn của tôi" liệt kê mọi Application của Candidate với tiêu đề tin, tên công ty, Application Status hiện tại. Mở một đơn để xem lịch sử Status Change. Candidate rút đơn (WITHDRAWN) khi đơn chưa HIRED/REJECTED/WITHDRAWN. Spec: user stories 22–24.

**Blocked by:** 05

**Status:** in-progress (A merged, B chờ 05B)

- [ ] `ApplicationService`: liệt kê đơn của Candidate, lấy lịch sử, rút đơn; Candidate chỉ được chuyển sang WITHDRAWN
- [ ] Test: rút đơn ở từng trạng thái chưa kết thúc thành công, ở trạng thái kết thúc bị từ chối; không xem được đơn của Candidate khác
- [ ] RPC đổi trạng thái atomic dùng chung cho ticket 07: `SELECT ... FOR UPDATE` trên Application, kiểm tra transition + actor, ghi Status Change trong cùng transaction
- [ ] Trang danh sách đơn và chi tiết lịch sử, nút rút đơn có xác nhận
- [ ] `npm test` và `npm run typecheck` xanh

## Phân công (Orca)

Contract: `docs/api-contract.md`, mục ticket 06.

- **Phần A — Claude (logic, worktree `agent-claude-logic`):** RPC đổi trạng thái atomic (`SELECT ... FOR UPDATE`, kiểm tra transition + actor), `listMyApplications`, `getMyApplication`, `withdrawApplicationAction`, test.
- **Phần B — Codex (giao diện, worktree `agent-codex`, sau khi Phần A merge):** trang `/candidate/applications`, `/candidate/applications/[id]` với lịch sử Status Change, nút rút đơn có xác nhận.
