# 26: API thông báo + dashboard + hồ sơ

**What to build:** Module FastAPI cho Notifications + Dashboard (ticket 17) và đọc/cập nhật hồ sơ chung (ticket 01).

**Blocked by:** 25

**Status:** ready-for-agent

- [ ] `backend/app/modules/notifications/**`: list 30 mới nhất, unread count (0 khi khách), mark read (ids rỗng = tất cả, tối đa 100 id)
- [ ] `backend/app/modules/dashboard/**`: dashboard Employer từ view `employer_posting_stats`, byStatus đủ 7 khóa, displayStatus EXPIRED
- [ ] `backend/app/modules/profiles/**`: GET/PATCH `/me/profile` (validate giống `auth-schema.ts` updateProfileSchema; Candidate không sửa companyName; phone rỗng = xóa)
- [ ] Endpoint đúng contract v3 mục 26; pytest InMemory + router; ruff xanh
- [ ] `cd backend && uv run pytest && uv run ruff check` xanh; `npm test` + `npm run typecheck` xanh

## Phân công (Orca)

ADR: `docs/adr/0003-fastapi-backend.md`. Contract: `docs/api-contract.md` mục v3.

- **Codex:** Codex: `backend/app/modules/{notifications,dashboard,profiles}/**` + test, dòng include_router.
