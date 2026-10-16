# 05: Candidate nộp Application kèm Resume PDF

**What to build:** Trên trang chi tiết tin đang mở, Candidate tải lên Resume PDF (tối đa 5 MB) và nộp Application. Nộp lần hai cùng tin báo lỗi rõ ràng (ADR-0002). Nộp vào tin DRAFT, CLOSED, Expired bị từ chối. Spec: user stories 19–21.

**Blocked by:** 01, 03

**Status:** ready-for-agent

- [ ] Module Application: `ApplicationService` + `IApplicationRepository`, InMemory adapter và Supabase adapter; bảng transition Application Status đặt trong domain theo spec
- [ ] Test TDD: nộp thành công tạo trạng thái SUBMITTED và một Status Change đầu tiên; nộp trùng bị từ chối; tin không mở bị từ chối
- [ ] Migration `applications` (UNIQUE job_posting_id + candidate_id), `application_status_changes` (append-only), RLS theo spec
- [ ] RPC submit atomic: kiểm tra tin đang mở bằng `now()` phía database, ghi Application + Status Change trong một transaction
- [ ] Bucket Storage `resumes` private, policy: Candidate chỉ upload vào thư mục mang user id của mình; chỉ nhận PDF ≤ 5 MB (kiểm tra cả client lẫn server)
- [ ] Kiểm tra tay: hai lần bấm nộp liên tiếp chỉ tạo một Application
- [ ] `npm test` và `npm run typecheck` xanh
