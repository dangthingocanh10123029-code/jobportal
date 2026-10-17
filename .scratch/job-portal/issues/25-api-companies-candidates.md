# 25: API công ty + ứng viên

**What to build:** Module FastAPI cho Company (ticket 15) và Candidate profile + saved postings (ticket 16). Codex chỉ viết phần backend; Claude logic chuyển Server Actions ở ticket 27.

**Blocked by:** 22

**Status:** ready-for-agent

- [ ] `backend/app/modules/companies/**`: list (tìm không dấu qua view `company_summaries`, phân trang 20), get kèm tin đang mở, get/patch của tôi (validate giống `companies-schema.ts`: tên 1–150, about ≤5000, website http/https ≤300, size enum), upload logo (PNG/JPEG/WebP ≤1MB, kiểm tra magic bytes, Storage REST với token người dùng, cập nhật `logo_url`)
- [ ] `backend/app/modules/candidates/**`: candidate profile get/patch (skills ≤20, 1–30, không trùng), applicant profile (chỉ chủ tin), saved postings toggle/list/ids
- [ ] Router đăng ký trong `app/main.py` (chỉ thêm dòng include_router), endpoint đúng contract v3 mục 25
- [ ] pytest với InMemory cho service + test router bằng dependency override; ruff xanh
- [ ] `cd backend && uv run pytest && uv run ruff check` xanh; `npm test` + `npm run typecheck` xanh

## Phân công (Orca)

ADR: `docs/adr/0003-fastapi-backend.md`. Contract: `docs/api-contract.md` mục v3.

- **Codex:** Codex: `backend/app/modules/{companies,candidates}/**` + test, dòng include_router.
