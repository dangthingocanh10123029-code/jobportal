# 07: Employer xem Application, tải Resume và chuyển trạng thái

**What to build:** Với mỗi tin của mình, Employer xem danh sách Application, tải Resume qua signed URL ngắn hạn, chuyển đơn tiến một bước (SUBMITTED → REVIEWING → INTERVIEWING → OFFERED → HIRED) hoặc từ chối (REJECTED) ở mọi bước chưa kết thúc. Không bao giờ thấy đơn hay Resume của tin thuộc Employer khác. Spec: user stories 25–30.

**Blocked by:** 05, 06

**Status:** ready-for-agent

- [ ] `ApplicationService`: liệt kê đơn theo tin, đổi trạng thái theo actor Employer (mọi transition trừ WITHDRAWN), dùng lại RPC đổi trạng thái của ticket 06
- [ ] Test: mọi transition hợp lệ/không hợp lệ cho Employer; Employer khác chủ tin bị từ chối
- [ ] Tạo signed URL Resume phía server sau khi kiểm tra đơn thuộc tin của Employer
- [ ] Trang danh sách đơn theo tin, nút chuyển trạng thái chỉ hiện các bước hợp lệ
- [ ] Kiểm tra tay: Candidate thấy Status Change mới trong trang "Đơn của tôi"
- [ ] `npm test` và `npm run typecheck` xanh

## Phân công (Orca)

Contract: `docs/api-contract.md`, mục ticket 07.

- **Phần A — Codex (backend):** `listApplicationsForPosting`, `changeApplicationStatusAction` (dùng RPC của ticket 06), `getResumeUrlAction` (signed URL sau khi kiểm tra chủ tin), test transition theo Employer.
- **Phần B — Antigravity (frontend, sau khi Phần A merge):** trang `/employer/postings/[id]/applications`, nút chuyển trạng thái theo `allowedNextStatuses`, nút tải CV.
