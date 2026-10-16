# 04: Tìm kiếm không dấu và bộ lọc

**What to build:** Candidate tìm tin đang mở theo từ khóa không cần gõ dấu ("ke toan" ra "Kế toán"), lọc theo địa điểm, hình thức làm việc và mức lương tối thiểu. Bộ lọc nằm trên URL để chia sẻ được link. Spec: user stories 14, 15.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] Migration bật extension `unaccent` + hàm wrapper immutable dùng cho tìm kiếm
- [ ] Search Filter trong `JobPostingService`; InMemory adapter bỏ dấu tiếng Việt (gồm cả "đ") để test khớp hành vi database
- [ ] Test: từ khóa không dấu, kết hợp nhiều bộ lọc, lương tối thiểu khớp tin "thỏa thuận" (salary_max null)
- [ ] Ô tìm kiếm + bộ lọc trên trang danh sách, đọc/ghi query string; Zod validate query string
- [ ] `npm test` và `npm run typecheck` xanh
