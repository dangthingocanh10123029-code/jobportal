# 35: API không được treo khi kết nối Postgres bị đứt

**What to build:** Sự cố thật 2026-10-17: sau vài giờ chạy, kết nối pool tới Supabase pooler bị đứt ngầm (`psycopg.OperationalError: the connection is lost`). Pool tiếp tục giao kết nối chết, `conn.rollback()` trong `user_tx` ném lỗi mới che lỗi gốc, socket chờ vô hạn → mọi endpoint (cả `/health`) treo > 15 s cho tới khi khởi động lại uvicorn.

**Blocked by:** 29

**Status:** resolved

- [ ] `ConnectionPool(check=ConnectionPool.check_connection, max_idle=…, max_lifetime=…)` nhỏ hơn timeout idle của pooler; `reconnect_timeout` hợp lý
- [ ] Tham số kết nối: `connect_timeout`, TCP keepalives (`keepalives=1, keepalives_idle=30, keepalives_interval=10, keepalives_count=3`), `options=-c statement_timeout=…` (vd 10 s) để không truy vấn nào treo vô hạn
- [ ] `user_tx`: nếu kết nối đã hỏng thì không gọi `rollback()` (hoặc bọc try), để pool loại bỏ kết nối; lỗi gốc được giữ nguyên; trả 503 `{ error: 'Hệ thống đang bận, vui lòng thử lại' }` thay vì treo/500 khó hiểu
- [ ] Thử lại MỘT lần cho lỗi kết nối xảy ra TRƯỚC khi gửi truy vấn (an toàn vì chưa có gì được ghi)
- [ ] `/health` trả 503 nhanh (≤ 3 s) khi DB không tới được
- [ ] Test: unit với kết nối giả bị đứt (pool loại bỏ, không treo, 503); integration: giết kết nối của pool bằng `pg_terminate_backend` rồi gọi endpoint → vẫn trả lời đúng
- [ ] pytest + ruff + integration xanh

## Phân công (Orca)
- **Claude logic:** toàn bộ ticket (sau 32A).
