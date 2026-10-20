# 40: Lịch phỏng vấn

**What to build:** Employer đặt lịch phỏng vấn cho đơn ứng tuyển (giờ, thời lượng, online/tại văn phòng, link/địa chỉ, ghi chú); Candidate xác nhận / từ chối / xin đổi giờ; Employer hủy hoặc đánh dấu đã phỏng vấn. Có thông báo hai chiều và trang lịch chung. Contract: `docs/api-contract.md` mục v5 → 40.

**Blocked by:** —

**Status:** ready-for-agent

### Phần A — Claude logic (DB + FastAPI + Server Actions) — branch `task/40-a-interviews`
- [x] Migration `supabase/migrations/20261020000100_interviews.sql`:
- Bảng `interviews` (CHECK đủ ràng buộc trong contract: thời lượng, mode/location, độ dài note), RLS: Candidate của đơn và Employer chủ tin đọc; ghi chỉ qua RPC security definer
- RPC `schedule_interview` (đơn REVIEWING → INTERVIEWING trong cùng transaction qua logic hiện có của `change_application_status`, ghi lịch sử; chặn lịch thứ 2 đang PROPOSED/CONFIRMED bằng partial unique index), `respond_interview`, `cancel_interview`, `mark_interview_done`
- `notifications.type` CHECK thêm `INTERVIEW_*`; thông báo tạo trong RPC
- FastAPI `backend/app/modules/interviews/**` (domain + service + InMemory + Postgres repo + router), endpoint: `POST /applications/{id}/interviews` (emp), `POST /interviews/{id}/respond` (cand), `POST /interviews/{id}/cancel`, `POST /interviews/{id}/done` (emp), `GET /me/interviews?scope=`, `GET /applications/{id}/interviews`
- `src/actions/interviews.ts` + types theo contract mục 40
- [x] Test: pytest (service InMemory + integration trên DB thật, rollback: đúng quyền, sai vai trò bị từ chối, giới hạn/ràng buộc), Vitest cho Zod của actions; thêm kiểm tra RLS vào `.scratch/job-portal/rls_checks.sql` nếu có bảng mới (Coordinator chạy)

#### REST (Phần A đã làm)
| Method + path | Server Action / hàm đọc |
|---|---|
| `POST /applications/{id}/interviews` (emp, `{ scheduledAt, durationMinutes, mode, location, note? }`) → 201 | `scheduleInterviewAction` |
| `POST /interviews/{id}/respond` (cand, `{ response, note? }`) | `respondInterviewAction` |
| `POST /interviews/{id}/cancel` (emp, `{ reason? }`) | `cancelInterviewAction` |
| `POST /interviews/{id}/done` (emp) | `markInterviewDoneAction` |
| `GET /me/interviews?scope=upcoming\|past` (auth, mặc định `upcoming`) | `listMyInterviews` |
| `GET /applications/{id}/interviews` (auth; 404 → `null`) | `listInterviewsForApplication` |

Ghi chú cho Phần B: `scheduledAt` phải là ISO có múi giờ (đổi giá trị `datetime-local` theo Asia/Ho_Chi_Minh, vd `2026-10-21T09:00:00+07:00`); link ONLINE tối đa 500 ký tự; lý do hủy ≤ 500 ký tự, chỉ hiện trong thông báo gửi Candidate (không lưu vào `Interview`); "upcoming" = chưa kết thúc (`scheduledAt + durationMinutes` ≥ hiện tại), mỗi scope tối đa 100 lịch. Đặt lịch cho đơn REVIEWING gửi Candidate 2 thông báo (đổi trạng thái + lịch mới).

### Phần B — Codex (giao diện) — branch `task/40-b-interviews`, sau Phần A
- `/interviews`: tab Sắp tới / Đã qua, thẻ lịch (ngày giờ theo Asia/Ho_Chi_Minh, nút tham gia nếu ONLINE, trạng thái màu)
- Employer: trong trang đơn ứng tuyển của tin → nút "Đặt lịch phỏng vấn" mở form (datetime-local, thời lượng, mode, link/địa chỉ, ghi chú); hủy / đánh dấu đã phỏng vấn
- Candidate: trong `/candidate/applications/[id]` hiện lịch + nút Xác nhận / Từ chối / Xin đổi giờ (bắt buộc ghi chú)
- Header: mục "Lịch phỏng vấn" cho Candidate và Employer
- [ ] Theo design system ticket 34 (layered & depth), mobile 360px, trạng thái rỗng/đang tải/lỗi, a11y (label, focus, aria-live cho thông báo)

## Chấp nhận
- [ ] pytest + ruff + integration xanh; npm test + typecheck xanh
- [ ] Coordinator: rls_checks, E2E thêm bước cho module này, deploy Vercel

## Phân công (Orca)
- **Phần A — Claude logic**, **Phần B — Codex**.
