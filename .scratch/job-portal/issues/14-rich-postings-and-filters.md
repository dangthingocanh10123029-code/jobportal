# 14: Tin chi tiết + bộ lọc mới

**What to build:** Tin có ngành nghề, cấp bậc, kinh nghiệm, số lượng tuyển, kỹ năng, Yêu cầu, Quyền lợi. Trang chủ lọc theo ngành/cấp bậc/kinh nghiệm/kỹ năng và sắp xếp; trang tin có việc làm liên quan. Spec: 31–33.

**Blocked by:** 13

**Status:** in-progress (A merged, B đang làm)

- [ ] Migration `20261017000100_*`: cột mới + CHECK + giá trị mặc định cho tin cũ; cập nhật `job_postings_guard`, view `open_job_postings` (thêm cột tìm kỹ năng không dấu), index cho lọc/sắp xếp
- [ ] `JobPostingService` + 2 adapter: trường mới, lọc industry/level/maxExperience/skill, sort 3 kiểu; InMemory khớp hành vi DB; test TDD (sort salary null ở cuối, skill không dấu, maxExperience)
- [ ] Zod `postingInputSchema` + `searchFilterSchema` mở rộng; `getRelatedPostings`
- [ ] UI: form tin có các trường mới (chọn ngành, cấp bậc, kinh nghiệm, số lượng, nhập kỹ năng dạng tag, 2 textarea Yêu cầu/Quyền lợi)
- [ ] UI: trang chủ có chip ngành nghề (icon `/images/industries/*.svg`), bộ lọc mới đồng bộ query string, sắp xếp; thẻ tin hiện ngành, cấp bậc, kỹ năng
- [ ] UI: trang tin tách Mô tả / Yêu cầu / Quyền lợi, hiện kỹ năng, khối Việc làm liên quan
- [ ] `npm test` và `npm run typecheck` xanh

## Phân công (Orca)

Contract: `docs/api-contract.md`, mục 14.

- **Phần A — Claude (logic, worktree `agent-claude-logic`):** migration, service, adapter, schema, `getRelatedPostings`, test.
- **Phần B — Codex (giao diện, worktree `agent-codex`, sau khi Phần A merge):** form tin, trang chủ (chip ngành + bộ lọc + sắp xếp), trang chi tiết tin, nhãn enum trong `format.ts`.
