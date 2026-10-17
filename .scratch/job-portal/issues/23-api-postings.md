# 23: API tin tuyển dụng

**What to build:** Chuyển nghiệp vụ Job Posting (v1 + v2) sang FastAPI và chuyển `src/actions/postings.ts` thành client mỏng gọi API, giữ nguyên chữ ký contract.

**Blocked by:** 22

**Status:** resolved

- [ ] Domain Python: lifecycle DRAFT→PUBLISHED→CLOSED, EXPIRED tính lúc đọc (ADR-0001), validate giống Zod hiện tại (tiêu đề, mô tả, lương, deadline có offset, industry/level/exp/headcount/skills/requirements/benefits), clock inject
- [ ] Postgres adapter đọc `job_postings_with_company` / `open_job_postings` (lọc + sort + phân trang + PGRST103 tương đương: page vượt range → items rỗng, total đúng), `record_posting_view` RPC khi xem chi tiết
- [ ] Router theo contract v3 mục 23; pytest TDD chuyển các case từ `job-posting.test.ts` sang (transition, deadline, sort salary null cuối, skill không dấu, related ≤6)
- [ ] `src/actions/postings.ts` gọi `apiFetch`; test action cũ còn nghĩa thì giữ (Zod input sai vẫn chặn ở Next hoặc trả lỗi API)
- [ ] Coordinator chạy E2E: các bước đăng tin/tìm kiếm/chi tiết phải xanh
- [ ] `cd backend && uv run pytest && uv run ruff check` xanh; `npm test` + `npm run typecheck` xanh

## Phân công (Orca)

ADR: `docs/adr/0003-fastapi-backend.md`. Contract: `docs/api-contract.md` mục v3.

- **Claude logic:** toàn bộ ticket.
