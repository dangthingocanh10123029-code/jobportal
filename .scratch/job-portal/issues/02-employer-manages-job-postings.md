# 02: Employer tạo, sửa, đăng và đóng Job Posting

**What to build:** Employer tạo Job Posting ở trạng thái DRAFT, sửa khi DRAFT hoặc PUBLISHED, đăng (PUBLISHED ngay, không duyệt), đóng (CLOSED). Trang "Tin của tôi" liệt kê mọi tin kèm trạng thái, hiển thị Expired cho tin PUBLISHED quá hạn (ADR-0001). Spec: user stories 6–12.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Module Job Posting: `JobPostingService` + `IJobPostingRepository`, InMemory adapter và Supabase adapter (theo `CODING_STANDARDS.md`)
- [ ] Clock được inject vào service; test TDD: transition hợp lệ/không hợp lệ, không sửa được tin CLOSED, đăng với deadline quá khứ bị từ chối, `salary_min <= salary_max`
- [ ] Migration `job_postings` với CHECK status/employment_type/salary + RLS: public chỉ đọc PUBLISHED, Employer đọc/ghi tin của mình
- [ ] Form tạo/sửa tin và trang danh sách tin cho Employer, Server Actions có Zod
- [ ] Kiểm tra tay: Employer B không thấy DRAFT của Employer A
- [ ] `npm test` và `npm run typecheck` xanh
