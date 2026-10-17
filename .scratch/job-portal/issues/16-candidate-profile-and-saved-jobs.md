# 16: Hồ sơ ứng viên + lưu việc

**What to build:** Candidate có hồ sơ (headline, kỹ năng, kinh nghiệm, học vấn) hiện cho Employer khi duyệt đơn; Candidate lưu tin và xem danh sách đã lưu. Spec: 36–37.

**Blocked by:** 15

**Status:** resolved

- [ ] Migration `20261017000300_*`: cột hồ sơ ứng viên (trên `profiles` hoặc bảng riêng) + RLS: chỉ chủ và Employer có đơn của họ đọc được; bảng `saved_postings` (candidate, posting, created_at, UNIQUE) + RLS
- [ ] `@/actions/candidates` theo contract mục 16; `employer_application_summaries` thêm headline + skills; test
- [ ] UI: `/candidate/profile` (kỹ năng dạng tag), nút lưu ♥ trên thẻ tin + trang tin (dùng `getSavedPostingIds`), `/candidate/saved` (tin hết hạn/đóng có nhãn), Employer xem hồ sơ ứng viên trong trang đơn
- [ ] `npm test` và `npm run typecheck` xanh

## Phân công (Orca)

Contract: `docs/api-contract.md`, mục 16.

- **Phần A — Claude (logic, worktree `agent-claude-logic`):** migration, actions, view, test.
- **Phần B — Codex (giao diện, worktree `agent-codex`, sau khi Phần A merge):** trang hồ sơ, nút lưu, trang việc đã lưu, hồ sơ ứng viên trong trang đơn của Employer.
