# 15: Trang công ty

**What to build:** Employer có hồ sơ công ty (logo, giới thiệu, quy mô, địa chỉ, website). Mọi người xem danh sách công ty và trang công ty với tin đang tuyển. Spec: 34–35.

**Blocked by:** 14

**Status:** ready-for-agent

- [ ] Migration `20261017000200_*`: bảng `companies` (id = employer, RLS public đọc, owner sửa), tạo dòng cho Employer hiện có + trigger khi Employer đăng ký; bucket public `company-logos` (PNG/JPEG/WebP ≤ 1 MB, thư mục = user id); view tin dùng tên + logo từ `companies`; đồng bộ `profiles.company_name`
- [ ] `@/actions/companies` theo contract mục 15, Zod (website http/https), test input sai
- [ ] UI: `/employer/company` sửa hồ sơ + upload logo (kiểm tra loại/dung lượng phía client), `/companies` (tìm + phân trang), `/companies/[id]`; logo trên thẻ tin/trang tin dùng `companyLogoUrl` hoặc `company-placeholder.svg`
- [ ] `npm test` và `npm run typecheck` xanh

## Phân công (Orca)

Contract: `docs/api-contract.md`, mục 15.

- **Phần A — Claude (logic, worktree `agent-claude-logic`):** migration, bucket + policy, actions, test.
- **Phần B — Codex (giao diện, worktree `agent-codex`, sau khi Phần A merge):** 3 trang công ty, logo trên thẻ tin, link tên công ty → trang công ty, mục menu "Công ty".
