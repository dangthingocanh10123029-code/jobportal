# 28: Sửa lỗi 500 danh sách tin đã lưu + chặn lớp lỗi SQL chưa test

**What to build:** E2E sau cutover phát hiện `GET /me/saved-postings` trả 500 (`missing FROM-clause entry for table "p"` ở `backend/app/modules/candidates/postgres.py:98`) và trang `/candidate/saved` hiện "0 tin" vì Server Action nuốt lỗi. Unit test InMemory không chạm SQL thật nên lỗi lọt qua.

**Blocked by:** 27

**Status:** ready-for-agent

### Phần Codex (module candidates)
- [ ] Sửa query `saved()` dùng đúng cột của view `saved_posting_summaries` (alias `s`): candidate_id, saved_at, id, employer_id, title, company_name, company_logo_url, location, employment_type, salary_min, salary_max, application_deadline, created_at, industry, level, experience_years, skills, status
- [ ] `isOpen` tính đúng (PUBLISHED và deadline ≥ now); thứ tự saved_at mới nhất trước
- [ ] Rà lại mọi query khác trong `companies/postgres.py`, `candidates/postgres.py`, `notifications/postgres.py`, `dashboard/postgres.py`, `profiles/postgres.py` cùng lớp lỗi (alias/cột sai)

### Phần Claude logic
- [ ] `backend/tests/integration/` (pytest marker `integration`, tự skip khi không có `DATABASE_URL` hoặc biến `RUN_INTEGRATION`): với mỗi Postgres adapter, gọi mọi phương thức ĐỌC trên DB thật dưới `user_tx` với claims của một user tạm tạo trong transaction rồi ROLLBACK (không để lại dữ liệu); kiểm tra không lỗi SQL + hình dạng kết quả. Lệnh: `uv run pytest -m integration`
- [ ] Server Actions đọc (`listSavedPostings`, `getSavedPostingIds`, `listMyNotifications`, `getEmployerDashboard`, `listMyApplications`, …): lỗi 5xx / lỗi mạng KHÔNG được biến thành rỗng — `throw` để Next hiện trang lỗi (vẫn trả rỗng/null cho 401/403/404 như contract)
- [ ] `apiFetch` log `console.error` (method, path, status) khi 5xx

- [ ] `cd backend && uv run pytest && uv run ruff check`; `RUN_INTEGRATION=1 uv run pytest -m integration` xanh trên Supabase thật; `npm test` + `npm run typecheck` xanh

## Phân công (Orca)
- **Codex:** phần module candidates (+ rà các module của mình).
- **Claude logic:** test tích hợp + Server Actions + apiFetch.
