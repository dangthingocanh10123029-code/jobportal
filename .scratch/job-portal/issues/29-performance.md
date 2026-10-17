# 29: Tăng tốc phản hồi

**What to build:** Đo thực tế (2026-10-17): RTT tới Supabase pooler Tokyo ≈ 100 ms/lệnh; mỗi request FastAPI ≈ 0,7–1,1 s (≈ 10 lượt đi về: BEGIN, SET ROLE, set_config, query, COMMIT, cộng thêm 1 transaction riêng để đọc role); trang Next 1–2,3 s vì gọi 3–5 API lần lượt. Mục tiêu: API ≤ 300 ms (1–2 RTT), trang ≤ 800 ms ở bản production.

**Blocked by:** 28

**Status:** ready-for-agent

### Phần A — Claude logic (backend + actions)
- [ ] `user_tx`: gộp thiết lập role + claims thành một lệnh (`select set_config('role', %s, true), set_config('request.jwt.claims', %s, true)`) và dùng psycopg pipeline để BEGIN + thiết lập + truy vấn đầu đi chung một lượt; giữ nguyên bảo đảm RLS (test: role/claims đúng, không rò giữa các request của pool)
- [ ] Cache role theo user id trong tiến trình (TTL vài phút, giới hạn kích thước) — role không đổi được (column grant); không cache khi không tìm thấy profile
- [ ] `record_posting_view` chạy bằng FastAPI BackgroundTasks sau khi trả response
- [ ] Đo lại bằng script `backend/scripts/bench.py` (gọi các endpoint chính N lần, in p50/p95) — kết quả trước/sau ghi vào worker_done
- [ ] `getCurrentProfile` + `getUnreadNotificationCount` trong header: không gọi lại nếu cùng request (cache()) — kiểm tra đã đúng

### Phần B — Codex (trang)
- [ ] Mọi page/layout gọi nhiều hàm đọc độc lập dùng `Promise.all` thay vì `await` lần lượt (đặc biệt `/jobs/[id]`, `/`, `/companies/[id]`, `/employer/postings/[id]/applications`, dashboard, site-header)
- [ ] Không đổi giao diện trong ticket này

- [ ] pytest + ruff, npm test + typecheck xanh; Coordinator chạy E2E

## Phân công (Orca)
- **Phần A — Claude logic**, **Phần B — Codex** (chạy song song, không đụng file của nhau).
