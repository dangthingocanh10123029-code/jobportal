# 46: Cẩm nang nghề nghiệp

**What to build:** Chuyên mục bài viết hướng dẫn (viết CV, phỏng vấn, lương, phát triển sự nghiệp, môi trường làm việc). Admin soạn, xem trước và đăng bài. Contract: `docs/api-contract.md` mục v5 → 46.

**Blocked by:** —

**Status:** ready-for-agent

### Phần A — Claude logic (DB + FastAPI + Server Actions) — branch `task/46-a-career-guide`
- [ ] Migration `supabase/migrations/20261020000700_articles.sql`:
- Bảng `articles` (slug unique, status, published_at, views, author_id), RLS: công khai đọc PUBLISHED; ghi chỉ ADMIN qua RPC (audit ARTICLE_PUBLISHED/UNPUBLISHED); `increment_article_views`
- Sinh slug không dấu ở backend, xử lý trùng (-2, -3…); `readingMinutes` = ceil(số từ / 200)
- FastAPI `backend/app/modules/articles/**`: `GET /articles?category&q&page`, `GET /articles/{slug}`, `GET /admin/articles`, `GET /admin/articles/{id}`, `POST /admin/articles`, `PUT /admin/articles/{id}`, `POST /admin/articles/{id}/published`
- `src/actions/articles.ts`; dữ liệu mẫu ≥ 12 bài TỰ VIẾT (không sao chép website khác), đủ 5 danh mục, nội dung 400–900 từ
- [ ] Test: pytest (service InMemory + integration trên DB thật, rollback: đúng quyền, sai vai trò bị từ chối, giới hạn/ràng buộc), Vitest cho Zod của actions; thêm kiểm tra RLS vào `.scratch/job-portal/rls_checks.sql` nếu có bảng mới (Coordinator chạy)

### Phần B — Codex (giao diện) — branch `task/46-b-career-guide`, sau Phần A
- `/guide`: hero, lọc danh mục, ô tìm, lưới thẻ bài (ảnh bìa theo danh mục), phân trang; `/guide/[slug]`: bài viết (component render Markdown rút gọn tự viết, escape HTML), mục lục từ `##`, bài liên quan
- `/admin/articles`: danh sách + trạng thái; trình soạn (textarea Markdown + xem trước), đăng/gỡ
- Header + footer: mục "Cẩm nang"
- [ ] Theo design system ticket 34 (layered & depth), mobile 360px, trạng thái rỗng/đang tải/lỗi, a11y (label, focus, aria-live cho thông báo)

## Chấp nhận
- [ ] pytest + ruff + integration xanh; npm test + typecheck xanh
- [ ] Coordinator: rls_checks, E2E thêm bước cho module này, deploy Vercel

## Phân công (Orca)
- **Phần A — Claude logic**, **Phần B — Codex**.
