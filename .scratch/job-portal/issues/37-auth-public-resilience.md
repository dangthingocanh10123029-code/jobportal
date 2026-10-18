# 37: Endpoint công khai không được sập vì token; JWKS bền vững

**What to build:** E2E trên bản production (2026-10-18): trang chủ trả 500 cho Ứng viên và Admin đã đăng nhập — server log `Error: Không đọc được danh sách tin: Phiên đăng nhập không hợp lệ hoặc đã hết hạn`. Nhiều tài khoản lỗi cùng lúc → nghi JWKS cache hết hạn và lần tải lại thất bại tạm thời; và dù nguyên nhân nào, endpoint công khai (`GET /postings`, `/postings/{id}`, `/companies…`, unread-count…) không được trả lỗi chỉ vì token gửi kèm không xác minh được.

**Blocked by:** 35

**Status:** resolved

- [ ] `optional_user`: token không xác minh được (chữ ký/hết hạn/JWKS lỗi) → coi như khách (log warning), KHÔNG 401; `current_user`/`require_*` giữ nguyên 401/403. Tài khoản bị khóa ở endpoint công khai → khách (không lộ dữ liệu riêng)
- [ ] JWKS: giữ bộ khóa tốt gần nhất khi lần tải lại thất bại (không từ chối mọi token vì một lần mạng chập chờn); `lifespan` dài hơn (vd 6 h) + tải lại khi gặp `kid` lạ; timeout tải ngắn
- [ ] Next `apiFetch`: đọc access token bằng `getUser()`-đã-xác-minh hoặc refresh session trước khi gửi nếu sắp hết hạn (kiểm tra cách middleware hiện làm); không gửi token đã hết hạn
- [ ] Test: unit (JWKS fetch lỗi sau khi đã có khóa → vẫn xác minh được; token rác ở endpoint công khai → 200 như khách; ở endpoint cần đăng nhập → 401), integration nếu cần
- [ ] pytest + ruff + integration, npm test + typecheck xanh

## Phân công (Orca)
- **Claude logic:** toàn bộ ticket.
