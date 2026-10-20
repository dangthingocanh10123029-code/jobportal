# 44: Gợi ý việc làm & job alert

**What to build:** Gợi ý tin phù hợp cho Candidate (kèm lý do khớp) và cho phép lưu bộ lọc tìm kiếm thành job alert để nhận thông báo khi có tin mới khớp. Contract: `docs/api-contract.md` mục v5 → 44.

**Blocked by:** —

**Status:** ready-for-agent

### Phần A — Claude logic (DB + FastAPI + Server Actions) — branch `task/44-a-recommendations-alerts`
- [ ] Migration `supabase/migrations/20261020000500_job_alerts.sql`:
- Bảng `job_alerts` (tối đa 5/Candidate, filter jsonb đã validate), RLS chủ sở hữu
- Trigger khi tin chuyển PUBLISHED: tạo notification `JOB_ALERT` cho alert đang bật khớp (dùng cùng logic khớp không dấu với tìm kiếm), cập nhật `last_matched_at`; không thông báo cho chính chủ tin
- Gợi ý: hàm SQL chấm điểm (kỹ năng trùng ×3, ngành từ đơn đã nộp ×2, địa điểm ×1), loại tin đã nộp / đã đóng / bị ẩn
- FastAPI `backend/app/modules/alerts/**`: `GET /me/recommendations`, `GET/POST /me/job-alerts`, `PATCH/DELETE /me/job-alerts/{id}`
- `src/actions/alerts.ts`
- [ ] Test: pytest (service InMemory + integration trên DB thật, rollback: đúng quyền, sai vai trò bị từ chối, giới hạn/ràng buộc), Vitest cho Zod của actions; thêm kiểm tra RLS vào `.scratch/job-portal/rls_checks.sql` nếu có bảng mới (Coordinator chạy)

### Phần B — Codex (giao diện) — branch `task/44-b-recommendations-alerts`, sau Phần A
- Trang chủ (Candidate đăng nhập): khối "Gợi ý cho bạn" với lý do khớp
- Trang tìm kiếm: nút "Tạo thông báo việc làm" lưu bộ lọc hiện tại (hỏi tên)
- `/candidate/alerts`: danh sách alert, bật/tắt, xóa, mô tả bộ lọc bằng tiếng Việt
- [ ] Theo design system ticket 34 (layered & depth), mobile 360px, trạng thái rỗng/đang tải/lỗi, a11y (label, focus, aria-live cho thông báo)

## Chấp nhận
- [ ] pytest + ruff + integration xanh; npm test + typecheck xanh
- [ ] Coordinator: rls_checks, E2E thêm bước cho module này, deploy Vercel

## Phân công (Orca)
- **Phần A — Claude logic**, **Phần B — Codex**.
