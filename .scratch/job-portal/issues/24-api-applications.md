# 24: API đơn ứng tuyển

**What to build:** Chuyển nghiệp vụ Application sang FastAPI: nộp CV (multipart → Storage bằng token người dùng → RPC `submit_application`), theo dõi, rút đơn, Employer duyệt, signed URL CV.

**Blocked by:** 23

**Status:** resolved

- [ ] Domain Python: bảng transition + `allowed_next_statuses(status, role)` giống TS; lỗi POSTING_NOT_OPEN / ALREADY_APPLIED / INVALID_RESUME / INVALID_TRANSITION / APPLICATION_NOT_FOUND → thông báo tiếng Việt như hiện tại
- [ ] `POST /applications`: kiểm tra PDF (MIME + magic `%PDF-`, ≤ 5 MB), upload `resumes/<uid>/<uuid>.pdf` qua Storage REST với Bearer người dùng, gọi RPC; RPC lỗi → xóa file vừa upload (best effort)
- [ ] Các endpoint còn lại theo contract v3 mục 24; signed URL 60s qua Storage REST bằng token Employer
- [ ] pytest: state machine theo actor, upload validate, dọn file khi RPC lỗi (fake storage client)
- [ ] `src/actions/applications.ts` gọi `apiFetch` (FormData chuyển tiếp nguyên)
- [ ] `cd backend && uv run pytest && uv run ruff check` xanh; `npm test` + `npm run typecheck` xanh

## Phân công (Orca)

ADR: `docs/adr/0003-fastapi-backend.md`. Contract: `docs/api-contract.md` mục v3.

- **Claude logic:** toàn bộ ticket.
