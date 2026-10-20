# 43: Tìm ứng viên

**What to build:** Candidate bật "Sẵn sàng tìm việc" để hồ sơ hiện với nhà tuyển dụng. Employer tìm ứng viên theo từ khóa/kỹ năng/địa điểm/kinh nghiệm, lưu ứng viên tiềm năng và mời ứng tuyển vào tin của mình. Không lộ email/số điện thoại. Contract: `docs/api-contract.md` mục v5 → 43.

**Blocked by:** 42

**Status:** ready-for-agent

### Phần A — Claude logic (DB + FastAPI + Server Actions) — branch `task/43-a-talent-search`
- [ ] Migration `supabase/migrations/20261020000400_talent.sql`:
- `profiles.open_to_work` (mặc định false), `location`, `experience_years` (0–50); bảng `saved_candidates`, `talent_invitations` (unique (posting_id, candidate_id)), RLS chặt
- Hàm tìm kiếm chỉ trả ứng viên open_to_work, không khóa; chỉ các cột công khai (KHÔNG email/phone); tìm không dấu như tìm tin
- RPC `invite_talent` (giới hạn 20/ngày, tin PUBLISHED của chính Employer) → notification `TALENT_INVITED`
- FastAPI `backend/app/modules/talent/**`: `POST /me/open-to-work` (cand), `GET /talent`, `GET /talent/{id}`, `POST /talent/{id}/save`, `GET /me/saved-talent`, `POST /talent/{id}/invite` (emp)
- `src/actions/talent.ts`; `CandidateProfile` thêm trường theo contract
- [ ] Test: pytest (service InMemory + integration trên DB thật, rollback: đúng quyền, sai vai trò bị từ chối, giới hạn/ràng buộc), Vitest cho Zod của actions; thêm kiểm tra RLS vào `.scratch/job-portal/rls_checks.sql` nếu có bảng mới (Coordinator chạy)

### Phần B — Codex (giao diện) — branch `task/43-b-talent-search`, sau Phần A
- Candidate: công tắc "Sẵn sàng tìm việc" + địa điểm + số năm kinh nghiệm trong `/candidate/profile`
- `/employer/talent`: bộ lọc + danh sách thẻ ứng viên + phân trang; `/employer/talent/[id]`: hồ sơ + CV online (nếu có), nút Lưu, "Mời ứng tuyển" (chọn tin đang mở + lời nhắn); `/employer/talent/saved`
- Header Employer: mục "Tìm ứng viên"
- [ ] Theo design system ticket 34 (layered & depth), mobile 360px, trạng thái rỗng/đang tải/lỗi, a11y (label, focus, aria-live cho thông báo)

## Chấp nhận
- [ ] pytest + ruff + integration xanh; npm test + typecheck xanh
- [ ] Coordinator: rls_checks, E2E thêm bước cho module này, deploy Vercel

## Phân công (Orca)
- **Phần A — Claude logic**, **Phần B — Codex**.
