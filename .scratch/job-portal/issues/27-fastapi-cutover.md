# 27: Chuyển hẳn sang FastAPI + dọn TS domain

**What to build:** Chuyển các Server Action còn lại (companies, candidates, notifications, dashboard, getCurrentProfile/updateProfile) sang gọi API, xóa domain TS không còn dùng, cập nhật tài liệu.

**Blocked by:** 24, 26

**Status:** resolved

- [ ] `src/actions/{companies,candidates,notifications,dashboard}.ts` + `getCurrentProfile`/`updateProfileAction` gọi `apiFetch`; `getCurrentActor` cho middleware vẫn đọc Supabase trực tiếp (nhẹ, không phụ thuộc API)
- [ ] `allowedNextStatuses` chuyển sang `src/lib/application-status.ts` (re-export từ `@/modules/application` nếu UI còn import, rồi Codex/Coordinator đổi import)
- [ ] Xóa `src/modules/**` adapter/service TS không còn dùng + test tương ứng; test Vitest còn lại tập trung vào Zod action + apiFetch
- [ ] Cập nhật `CODING_STANDARDS.md` phần kiến trúc (Coordinator duyệt), README: chạy 2 tiến trình
- [ ] Coordinator: E2E 34/34, rls_checks, v2_checks với backend thật
- [ ] `cd backend && uv run pytest && uv run ruff check` xanh; `npm test` + `npm run typecheck` xanh

## Phân công (Orca)

ADR: `docs/adr/0003-fastapi-backend.md`. Contract: `docs/api-contract.md` mục v3.

- **Claude logic:** toàn bộ ticket.
