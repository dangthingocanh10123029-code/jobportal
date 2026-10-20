# 41: Nhắn tin

**What to build:** Chat giữa Employer và Candidate theo từng đơn ứng tuyển, có số tin chưa đọc trên header, khóa gửi khi đơn đã kết thúc. Contract: `docs/api-contract.md` mục v5 → 41.

**Blocked by:** —

**Status:** ready-for-agent

### Phần A — Claude logic (DB + FastAPI + Server Actions) — branch `task/41-a-messages`
- [x] Migration `supabase/migrations/20261020000200_messages.sql`:
- Bảng `messages` (body 1–2000, index (application_id, created_at)), RLS: chỉ 2 bên của đơn đọc; insert qua RPC `send_message` kiểm trạng thái đơn + giới hạn 30 tin/phút; `read_at` cập nhật qua RPC `mark_conversation_read`
- View/hàm `my_conversations` (tin cuối, số chưa đọc, canSend) không N+1
- FastAPI `backend/app/modules/messages/**`: `GET /me/conversations`, `GET /applications/{id}/messages?before=`, `POST /applications/{id}/messages`, `POST /applications/{id}/messages/read`, `GET /me/messages/unread-count`
- `src/actions/messages.ts` theo contract mục 41
- [x] Test: pytest (service InMemory + integration trên DB thật, rollback: đúng quyền, sai vai trò bị từ chối, giới hạn/ràng buộc), Vitest cho Zod của actions; thêm kiểm tra RLS vào `.scratch/job-portal/rls_checks.sql` nếu có bảng mới (Coordinator chạy)

#### REST (Phần A đã làm)
| Method + path | Server Action / hàm đọc |
|---|---|
| `GET /me/conversations` (auth) | `listConversations` |
| `GET /applications/{id}/messages?before=<ISO>` (auth; 404 → `null`) → `{ conversation, messages, hasMore }` | `getConversation` |
| `POST /applications/{id}/messages` (auth, `{ body }`) → 201 | `sendMessageAction` |
| `POST /applications/{id}/messages/read` (auth) | `markConversationReadAction` |
| `GET /me/messages/unread-count` (khách → 0) | `getUnreadMessageCount` |

Ghi chú cho Phần B: lỗi gửi — 409 "Hồ sơ đã kết thúc, không thể gửi tin nhắn" (khi `canSend=false`), 429 "Bạn gửi tin quá nhanh, vui lòng thử lại sau ít phút" (> 30 tin/phút/người); `before` = `createdAt` của tin cũ nhất đang hiển thị (giữ nguyên chuỗi ISO API trả về); `getConversation` vẫn trả hội thoại cho đơn đã kết thúc chưa có tin (`messages=[]`, `canSend=false`), còn `listConversations` thì ẩn đơn đó; `otherPartyLogoUrl` chỉ có với Candidate (logo công ty), Employer luôn `null`; danh sách tối đa 100 hội thoại.

### Phần B — Codex (giao diện) — branch `task/41-b-messages`, sau Phần A
- `/messages`: danh sách hội thoại (desktop 2 cột: danh sách + khung chat; mobile 360px: một cột), `/messages/[applicationId]`: khung chat, tải tin cũ hơn, ô nhập (Enter gửi, Shift+Enter xuống dòng), trạng thái không gửi được khi `canSend=false`
- Tự `router.refresh()` mỗi 10 giây khi tab hiển thị; đánh dấu đã đọc khi mở
- Header: biểu tượng tin nhắn có số chưa đọc; nút "Nhắn tin" trong trang đơn ứng tuyển (cả hai vai trò)
- [ ] Theo design system ticket 34 (layered & depth), mobile 360px, trạng thái rỗng/đang tải/lỗi, a11y (label, focus, aria-live cho thông báo)

## Chấp nhận
- [ ] pytest + ruff + integration xanh; npm test + typecheck xanh
- [ ] Coordinator: rls_checks, E2E thêm bước cho module này, deploy Vercel

## Phân công (Orca)
- **Phần A — Claude logic**, **Phần B — Codex**.
