# 47: Gói dịch vụ & tin nổi bật

**What to build:** Employer mua gói đẩy tin nổi bật (TOP 7/14/30 ngày) với thanh toán GIẢ LẬP. Tin nổi bật lên đầu danh sách và có khối riêng trên trang chủ. Admin quản lý gói và xem đơn hàng/doanh thu giả lập. Contract: `docs/api-contract.md` mục v5 → 47.

**Blocked by:** —

**Status:** ready-for-agent

### Phần A — Claude logic (DB + FastAPI + Server Actions) — branch `task/47-a-billing-featured`
- [ ] Migration `supabase/migrations/20261020000800_billing.sql`:
- Bảng `service_packages` (seed TOP_7 / TOP_14 / TOP_30), `orders`; `job_postings.featured_until`
- RPC `create_order`, `pay_order` (giả lập, chỉ chủ đơn, PENDING → PAID, cộng dồn featured_until, notification ORDER_PAID), `cancel_order`; admin `admin_save_package` (audit PACKAGE_UPDATED)
- Danh sách công khai: `featured` trong PostingSummary/Detail; sort newest đưa tin nổi bật lên đầu; `AdminStats.revenue`
- FastAPI `backend/app/modules/billing/**`: `GET /packages`, `POST /me/orders`, `POST /me/orders/{id}/pay`, `POST /me/orders/{id}/cancel`, `GET /me/orders`, `GET /admin/packages`, `POST /admin/packages`, `PUT /admin/packages/{id}`, `GET /admin/orders`
- `src/actions/billing.ts`
- [ ] Test: pytest (service InMemory + integration trên DB thật, rollback: đúng quyền, sai vai trò bị từ chối, giới hạn/ràng buộc), Vitest cho Zod của actions; thêm kiểm tra RLS vào `.scratch/job-portal/rls_checks.sql` nếu có bảng mới (Coordinator chạy)

### Phần B — Codex (giao diện) — branch `task/47-b-billing-featured`, sau Phần A
- `/employer/billing`: bảng gói, chọn tin + gói → tạo đơn; lịch sử đơn; `/employer/billing/checkout/[orderId]`: trang thanh toán GIẢ LẬP (ghi rõ không thu tiền thật), nút Thanh toán / Hủy
- Huy hiệu "Nổi bật" trên thẻ tin và trang chi tiết; khối "Việc làm nổi bật" trên trang chủ; nút "Đẩy tin" trong `/employer/postings`
- `/admin/packages` (sửa giá/thời hạn/bật tắt), `/admin/orders`; thẻ doanh thu trên `/admin`
- [ ] Theo design system ticket 34 (layered & depth), mobile 360px, trạng thái rỗng/đang tải/lỗi, a11y (label, focus, aria-live cho thông báo)

## Chấp nhận
- [ ] pytest + ruff + integration xanh; npm test + typecheck xanh
- [ ] Coordinator: rls_checks, E2E thêm bước cho module này, deploy Vercel

## Phân công (Orca)
- **Phần A — Claude logic**, **Phần B — Codex**.
