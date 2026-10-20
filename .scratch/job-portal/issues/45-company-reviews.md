# 45: Đánh giá công ty

**What to build:** Candidate từng ứng tuyển vào công ty viết đánh giá (sao, ưu/nhược điểm, ẩn danh). Admin kiểm duyệt trước khi hiển thị. Trang công ty hiện điểm trung bình, phân bố sao và danh sách review. Contract: `docs/api-contract.md` mục v5 → 45.

**Blocked by:** —

**Status:** resolved (migration đổi số 0600 → 0750 để chạy sau 0700_articles)

### Phần A — Claude logic (DB + FastAPI + Server Actions) — branch `task/45-a-company-reviews`
- [ ] Migration `supabase/migrations/20261020000750_company_reviews.sql`:
- Bảng `company_reviews` (unique (company_id, candidate_id), rating 1–5, status, reject_reason), RLS: công khai chỉ thấy APPROVED (không lộ candidate_id khi anonymous — dùng view); tác giả thấy review của mình
- Điều kiện viết: đã từng có đơn vào tin của công ty (kiểm trong RPC `submit_review`)
- RPC admin `admin_moderate_review` (is_admin, audit REVIEW_APPROVED/REJECTED, notification REVIEW_MODERATED)
- `CompanySummary` thêm rating/reviewCount (tính trong view, không N+1)
- FastAPI `backend/app/modules/reviews/**` + bổ sung admin: `GET /companies/{id}/reviews`, `GET/POST /companies/{id}/my-review`, `GET /companies/{id}/can-review`, `GET /admin/reviews`, `POST /admin/reviews/{id}/moderate`
- `src/actions/reviews.ts` + bổ sung `src/actions/admin.ts`; dữ liệu mẫu ~60 review APPROVED tự viết
- [ ] Test: pytest (service InMemory + integration trên DB thật, rollback: đúng quyền, sai vai trò bị từ chối, giới hạn/ràng buộc), Vitest cho Zod của actions; thêm kiểm tra RLS vào `.scratch/job-portal/rls_checks.sql` nếu có bảng mới (Coordinator chạy)

### Phần B — Codex (giao diện) — branch `task/45-b-company-reviews`, sau Phần A
- Trang công ty: điểm trung bình, biểu đồ phân bố sao, danh sách review + phân trang, form viết review (nếu `canReviewCompany`), trạng thái review của tôi (chờ duyệt / bị từ chối + lý do, sửa lại)
- Thẻ công ty `/companies`: sao + số review
- `/admin/reviews`: lọc trạng thái, duyệt / từ chối (lý do)
- [ ] Theo design system ticket 34 (layered & depth), mobile 360px, trạng thái rỗng/đang tải/lỗi, a11y (label, focus, aria-live cho thông báo)

## Chấp nhận
- [ ] pytest + ruff + integration xanh; npm test + typecheck xanh
- [ ] Coordinator: rls_checks, E2E thêm bước cho module này, deploy Vercel

## Phân công (Orca)
- **Phần A — Claude logic**, **Phần B — Codex**.
