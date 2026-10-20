# 42: CV online

**What to build:** Candidate tạo CV trên web theo mẫu (2 template), in/lưu PDF bằng trình duyệt, và nộp đơn bằng CV online thay vì file PDF. Employer xem bản chụp CV lúc nộp. Contract: `docs/api-contract.md` mục v5 → 42.

**Blocked by:** —

**Status:** ready-for-agent

### Phần A — Claude logic (DB + FastAPI + Server Actions) — branch `task/42-a-online-cv`
- [ ] Migration `supabase/migrations/20261020000300_online_cv.sql`:
- Bảng `candidate_cvs` (1 dòng/Candidate, jsonb cho experiences/educations/certifications với CHECK `jsonb_array_length`), RLS chủ sở hữu
- `applications.cv_source` ('FILE'|'ONLINE', mặc định FILE) + `applications.online_cv jsonb` (bản chụp); `resume_path` cho phép null khi ONLINE (CHECK đúng một nguồn); cập nhật `submit_application` nhận nguồn ONLINE và chụp CV trong cùng transaction
- Validate cấu trúc jsonb ở FastAPI (Pydantic) theo đúng giới hạn contract
- FastAPI `backend/app/modules/cv/**`: `GET/PUT/DELETE /me/cv` (cand), `GET /applications/{id}/cv` (emp chủ tin); `POST /applications` nhận `cvSource`
- `src/actions/cv.ts`; `submitApplicationAction` hỗ trợ `cvSource`
- [ ] Test: pytest (service InMemory + integration trên DB thật, rollback: đúng quyền, sai vai trò bị từ chối, giới hạn/ràng buộc), Vitest cho Zod của actions; thêm kiểm tra RLS vào `.scratch/job-portal/rls_checks.sql` nếu có bảng mới (Coordinator chạy)

### Phần B — Codex (giao diện) — branch `task/42-b-online-cv`, sau Phần A
- `/candidate/cv`: trình soạn CV (các mục thêm/xóa/sắp xếp kinh nghiệm, học vấn, chứng chỉ; kỹ năng dạng tag), xem trước trực tiếp, chọn template CLASSIC/MODERN
- `/candidate/cv/print`: bản in sạch (`@media print`), nút "Lưu PDF" gọi `window.print()`
- Form nộp đơn `/jobs/[id]`: chọn "Dùng CV online" hoặc "Tải file PDF"
- `/employer/applications/[id]/cv`: xem bản chụp CV; danh sách đơn hiện nhãn "CV online"
- [ ] Theo design system ticket 34 (layered & depth), mobile 360px, trạng thái rỗng/đang tải/lỗi, a11y (label, focus, aria-live cho thông báo)

## Chấp nhận
- [ ] pytest + ruff + integration xanh; npm test + typecheck xanh
- [ ] Coordinator: rls_checks, E2E thêm bước cho module này, deploy Vercel

## Phân công (Orca)
- **Phần A — Claude logic**, **Phần B — Codex**.
