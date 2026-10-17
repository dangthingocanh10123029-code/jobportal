# 20: Sửa các phát hiện của /code-review v2

**What to build:** Sửa các vi phạm CODING_STANDARDS.md và thiếu sót spec ticket 18 mà /code-review (2 trục) tìm thấy trên diff `df6d42a...HEAD`. Không đổi chữ ký contract, không đổi hành vi người dùng thấy.

**Blocked by:** 14–19

**Status:** ready-for-agent

### Standards
- [ ] §2.3: `listCompanies` (`src/actions/companies.ts:95`) và `listOpenPostings` (`src/actions/postings.ts:85`) dùng `safeParse` (lỗi → giá trị mặc định), không dùng `.parse`
- [ ] Gom `fail(...)` và các hàm `context()/employerContext()/candidateContext()` lặp lại trong `src/actions/{candidates,companies,notifications,postings,applications,dashboard}.ts` về một helper dùng chung (vd `src/actions/_shared.ts` — không phải file `'use server'`); đặt tên rõ (`requireEmployer`, `requireCandidate`, `requireSignedIn`…)
- [ ] `companies.ts:103` dùng lại `publicService()` thay vì tạo service mới
- [ ] Bỏ trùng mapping row → PostingSummary: `candidate/adapters/supabase.ts:148-165` dùng chung hàm map của `job-posting/adapters/supabase.ts` (export từ đó)
- [ ] Branded type: `applicationId` trong module candidate là `ApplicationId`; `PostingStats.id` và `listSavedIds()` dùng `JobPostingId`; quan hệ `CompanyId` = `EmployerId` khai báo một chỗ trong domain (alias hoặc hàm chuyển có comment), bỏ ép kiểu qua lại rải rác
- [ ] §1.2: các module mới (`dashboard`, `company`, `candidate`, `notification`) không import từ `@/actions/types` — kiểu domain đặt trong module (hoặc một `src/modules/shared/types.ts`), `src/actions/types.ts` re-export cho UI; giữ nguyên tên/hình dạng kiểu contract

### Spec (ticket 18)
- [ ] Wipe không để lại file mồ côi: KHÔNG xóa dòng `storage.objects` của CV demo bằng SQL. CV demo là file cố định trong thư mục của từng ứng viên demo (id ổn định từ md5), tồn tại qua các lần wipe/seed; seed chỉ tham chiếu (`resume_path`) tới chúng
- [ ] `supabase/seed/upload-demo-cvs.sh`: upload `sample-cv.pdf` cho mọi ứng viên demo bằng chính phiên đăng nhập của họ (password grant với anon/publishable key — KHÔNG cần service role), bỏ qua file đã có (idempotent); chỉ cần chạy một lần cho project. Không đặt tên biến `path` trong zsh
- [ ] Seed kiểm tra và in cảnh báo nếu CV demo chưa có trong storage (nhắc chạy script)
- [ ] Wipe xóa thêm thông báo của người dùng thật có `link` trỏ tới đơn/tin demo bị xóa
- [ ] README seed cập nhật quy trình: lần đầu `seed` → `upload-demo-cvs.sh`; các lần sau chỉ `seed`

- [ ] `npm test` + `npm run typecheck` xanh

## Phân công (Orca)
- **Phần A — Claude (logic, worktree `agent-claude-logic`):** toàn bộ ticket. Không có Phần B.
