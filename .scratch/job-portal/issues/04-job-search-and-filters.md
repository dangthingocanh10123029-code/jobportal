# 04: Tìm kiếm không dấu và bộ lọc

**What to build:** Candidate tìm tin đang mở theo từ khóa không cần gõ dấu ("ke toan" ra "Kế toán"), lọc theo địa điểm, hình thức làm việc và mức lương tối thiểu. Bộ lọc nằm trên URL để chia sẻ được link. Spec: user stories 14, 15.

**Blocked by:** 03

**Status:** in-progress (A merged, B đang làm)

- [ ] Migration bật extension `unaccent` + hàm wrapper immutable dùng cho tìm kiếm
- [ ] Search Filter trong `JobPostingService`; InMemory adapter bỏ dấu tiếng Việt (gồm cả "đ") để test khớp hành vi database
- [ ] Test: từ khóa không dấu, kết hợp nhiều bộ lọc, lương tối thiểu khớp tin "thỏa thuận" (salary_max null)
- [ ] Ô tìm kiếm + bộ lọc trên trang danh sách, đọc/ghi query string; Zod validate query string
- [ ] `npm test` và `npm run typecheck` xanh

## Phân công (Orca)

Contract: `docs/api-contract.md`, mục ticket 04.

- **Phần A — Claude (logic, worktree `agent-claude-logic`):** migration `unaccent` + hàm wrapper, mở rộng `listOpenPostings` với `q`, `location`, `employmentType`, `minSalary`, InMemory bỏ dấu tiếng Việt, test.
- **Phần B — Codex (giao diện, worktree `agent-codex`, sau khi Phần A merge):** ô tìm kiếm + bộ lọc trên `/`, đồng bộ với query string, giữ bộ lọc khi chuyển trang.
