# 38: FastAPI dùng transaction pooler, không chiếm hết giới hạn session pooler

**What to build:** E2E 2026-10-18: Supabase session pooler (cổng 5432) báo `EMAXCONNSESSION max clients reached in session mode - pool_size: 15`. Pool FastAPI giữ tới 10/15 client → psql, test tích hợp, script seed/dọn dữ liệu và trang admin lỗi 500. Supabase khuyến nghị app server dùng transaction pooler (cổng 6543).

**Blocked by:** 37

**Status:** ready-for-agent

- [ ] `DATABASE_URL` của app trỏ transaction pooler (6543); giữ một biến riêng (vd `DATABASE_URL_SESSION`) cho việc cần session (test tích hợp dùng savepoint/ROLLBACK dài, migration) nếu thật sự cần — ghi rõ trong `backend/.env.example` + README
- [ ] psycopg tương thích transaction mode: `prepare_threshold=None` (không prepared statement), không dùng `SET` cấp session (mọi thiết lập đã là `set_config(..., true)` trong transaction — giữ nguyên), `statement_timeout` qua `set_config` trong transaction
- [ ] Pool: `max_size` đọc từ cấu hình (mặc định 10 cho transaction mode), `min_size` nhỏ
- [ ] Kiểm chứng RLS vẫn đúng ở transaction mode: integration `test_user_tx` (role/claims không rò giữa request) + toàn bộ integration xanh khi chạy với URL 6543
- [ ] Đo lại `scripts/bench.py` (ghi p50 trước/sau)
- [ ] pytest + ruff + integration, npm test + typecheck xanh

## Phân công (Orca)
- **Claude logic:** toàn bộ ticket. Coordinator sẽ cập nhật `backend/.env` thật sau khi merge.
