# 42: CV online

**What to build:** Candidate tạo CV trên web theo mẫu (2 template), in/lưu PDF bằng trình duyệt, và nộp đơn bằng CV online thay vì file PDF. Employer xem bản chụp CV lúc nộp. Contract: `docs/api-contract.md` mục v5 → 42.

**Blocked by:** —

**Status:** resolved

### Phần A — Claude logic (DB + FastAPI + Server Actions) — branch `task/42-a-online-cv`
- [x] Migration `supabase/migrations/20261020000300_online_cv.sql`:
- Bảng `candidate_cvs` (1 dòng/Candidate, jsonb cho experiences/educations/certifications với CHECK `jsonb_array_length`), RLS chủ sở hữu
- `applications.cv_source` ('FILE'|'ONLINE', mặc định FILE) + `applications.online_cv jsonb` (bản chụp); `resume_path` cho phép null khi ONLINE (CHECK đúng một nguồn); cập nhật `submit_application` nhận nguồn ONLINE và chụp CV trong cùng transaction
- Validate cấu trúc jsonb ở FastAPI (Pydantic) theo đúng giới hạn contract
- FastAPI `backend/app/modules/cv/**`: `GET/PUT/DELETE /me/cv` (cand), `GET /applications/{id}/cv` (emp chủ tin); `POST /applications` nhận `cvSource`
- `src/actions/cv.ts`; `submitApplicationAction` hỗ trợ `cvSource`
- [x] Test: pytest (service InMemory + integration trên DB thật, rollback: đúng quyền, sai vai trò bị từ chối, giới hạn/ràng buộc), Vitest cho Zod của actions; thêm kiểm tra RLS vào `.scratch/job-portal/rls_checks.sql` nếu có bảng mới (Coordinator chạy)

#### REST (Phần A đã làm)
| Method + path | Server Action / hàm đọc |
|---|---|
| `GET /me/cv` (cand) → `OnlineCv \| null` | `getMyCv` |
| `PUT /me/cv` (cand, body = `Omit<OnlineCv, 'candidateId' \| 'updatedAt'>`) → 200 | `saveMyCvAction` |
| `DELETE /me/cv` (cand) | `deleteMyCvAction` |
| `GET /applications/{id}/cv` (emp chủ tin; 404 → `null`) → bản chụp hoặc `null` với đơn nộp file | `getApplicationCv` |
| `POST /applications` (cand, multipart `postingId` + `cvSource` `FILE`\|`ONLINE` + `resume` khi FILE) | `submitApplicationAction` |

Ghi chú cho Phần B: giới hạn ngoài contract do Phần A chốt (Zod = Pydantic = CHECK): `fullName` 1–100, `headline`/`location` ≤ 150, `phone` cùng regex hồ sơ, `email` dạng a@b.c ≤ 254, `languages` mỗi mục 1–30, chứng chỉ `name`/`issuer` ≤ 150, `year` 1950–2100. Ô tùy chọn để trống → `null`; `description` trống → `''`. Nộp ONLINE khi chưa có CV → 422 "Bạn chưa tạo CV online". `cvSource` có ở `Application`, `CandidateApplicationSummary`, `EmployerApplicationSummary`; `getResumeUrlAction` cho đơn ONLINE trả lỗi 404 (dùng `/employer/applications/[id]/cv`). Xóa CV không ảnh hưởng đơn đã nộp.

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
