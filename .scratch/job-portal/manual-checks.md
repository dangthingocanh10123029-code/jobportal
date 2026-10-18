# Kiểm tra tay trên Supabase thật

Project `boncnxhjkbqxlcebzcyc`, 7 migration đã push (2026-10-16). Kiểm tra bằng `.scratch/job-portal/rls_checks.sql`:
chạy với từng role thật (`anon`, `authenticated` + JWT giả) trong một transaction **ROLLBACK** — không để lại dữ liệu, không gửi email.
Chạy lại: `psql "<session pooler URL>" -q -At -f .scratch/job-portal/rls_checks.sql`

## Đã kiểm tra — 55/55 PASS (SQL) + PGRST103 qua REST
- [x] `npm run build` xanh khi có `.env.local`
- [x] 01: trigger tạo profile đúng role; role sai bị CHECK chặn; Candidate chỉ đọc profile mình; không sửa được role; sửa được phone; anon đọc `employer_companies`, không đọc `profiles`
- [x] 02: Employer B không thấy/sửa tin của A; Candidate không tạo tin; tin mới là DRAFT; không insert thẳng PUBLISHED; trigger chặn sửa CLOSED, DRAFT→CLOSED, đăng deadline quá khứ; CHECK lương
- [x] 03: anon không thấy DRAFT, thấy CLOSED; `open_job_postings` chỉ có PUBLISHED chưa hết hạn; owner thấy DRAFT của mình
- [x] 04: `f_unaccent` bỏ dấu + đ/Đ; tìm không dấu; location contains; `%` được escape
- [x] 05: Storage chặn upload vào thư mục người khác; RPC chặn CV lạ, tin CLOSED/hết hạn/DRAFT, nộp trùng, Employer, anon; nộp thành công → SUBMITTED + 1 Status Change; không insert `applications` trực tiếp; history append-only
- [x] 06: Candidate khác không thấy/rút đơn; view tóm tắt đúng; Candidate không chuyển REVIEWING; rút ở REVIEWING được; rút lại bị chặn
- [x] 07: Employer B không thấy đơn/CV/đổi trạng thái; Employer A thấy tên + SĐT, đọc được CV; transition hợp lệ được, WITHDRAWN/nhảy cóc bị chặn; Candidate thấy Status Change mới
- [x] 09A: PostgREST trả `PGRST103` (416) khi page vượt range → code fallback đúng nhánh

## Chưa kiểm tra — cần chạy app thật với tài khoản thật
- [x] Đăng ký → mã OTP qua email (SMTP Gmail) → xác nhận + đăng nhập → `/account` → cập nhật hồ sơ (2026-10-16 17:20)
- [x] Đăng xuất / đăng nhập, chặn route theo role (E2E 2026-10-17)
- [x] Upload CV thật qua Storage API (E2E)
- [x] Storage API: xóa được CV mồ côi, KHÔNG xóa được CV đã gắn đơn (`resumes_delete_unused`) — `e2e/remaining.sh`
- [x] `createSignedUrl` 60s cho Employer tải CV — trả về PDF (E2E)
- [x] Hai request đồng thời (Ứng viên rút + Employer từ chối): B chờ khóa `FOR UPDATE` rồi bị `INVALID_TRANSITION`; kết quả WITHDRAWN, 2 Status Change
- [x] Security advisor: 2 security-definer view + RPC submit/change status là đúng thiết kế; `handle_new_user` đã revoke EXECUTE (ticket 13); còn `auth_leaked_password_protection` (bật trong Dashboard, gói Pro)

## E2E Playwright — 27/27 PASS (2026-10-17)
Script: `.scratch/job-portal/e2e/`. Đăng tin → tìm kiếm/lọc → nộp CV → tải CV → đổi trạng thái → lịch sử → rút đơn → đóng tin → đăng xuất. DB khớp: tin CLOSED, đơn WITHDRAWN, 3 Status Change, CV `application/pdf` trong bucket `resumes`.

## Ticket 13 (2026-10-17)
- [x] Migration 0700 đã push: xóa Employer kéo theo tin + đơn; xóa Candidate không bị chặn; 55/55 rls_checks vẫn PASS
- [x] `/auth/callback`: thiếu/sai code → `/login?error=link`; Redirect URLs đã thêm `http://localhost:3000/auth/callback`
- [x] E2E chạy lại 27/27 PASS
- [ ] Bấm link trong email thật → vào app đã đăng nhập (cần một lượt đăng ký thật)

## v2 (tickets 14–19) — 2026-10-17
- [x] 4 migration v2 đã push (0100 rich postings, 0200 companies, 0300 candidate profile/saved, 0400 notifications/dashboard)
- [x] `v2_checks.sql` 23/23 PASS; `rls_checks.sql` vẫn 55/55
- [x] Seed demo trên Supabase thật: 40 công ty, 302 tin, 30 ứng viên, 187 đơn, 432 thông báo; CV mẫu upload qua Storage API bằng chính phiên của từng ứng viên (không cần service role key) — 187/187 đơn có file CV
- [x] E2E Playwright 34/34 PASS khi đã có dữ liệu demo
- Ghi chú: README seed hướng dẫn upload CV bằng service role key; cách không cần key: xóa dòng storage trống (`storage.allow_delete_query`) rồi đăng nhập từng ứng viên demo (`DemoJob!2026`) và POST file vào đúng đường dẫn

## /code-review v2 → tickets 20–21 (2026-10-17)
- [x] Refactor 20A: `_shared.ts` (fail/requireEmployer/requireCandidate/requireSignedIn), safeParse, branded types, kiểu domain ở `src/modules/shared/types.ts`
- [x] Seed: CV demo cố định `resumes/<candidate>/demo-cv.pdf`, `upload-demo-cvs.sh` (không cần service key) đã chạy; 30 CV cũ (tên uuid) đã xóa qua Storage API; 187/187 đơn demo có CV
- [x] E2E cleanup xóa CV qua Storage API (không để file mồ côi)
- [x] rls_checks 55/55, v2_checks 23/23, E2E 34/34 sau 20A + 21B
- Ghi chú: các lần dọn trước (SQL delete storage.objects) có thể đã để lại vài file e2e mồ côi trong bucket `resumes` (không còn dòng tham chiếu, cần service role key hoặc Dashboard → Storage để xóa)

## v3 — FastAPI backend (tickets 22–28, 2026-10-17)
- [x] `/health` ok (DB + JWKS ES256), Swagger `/docs`
- [x] Toàn bộ Server Action nghiệp vụ gọi FastAPI; `src/modules` đã xóa
- [x] pytest 133 + integration 8/8 (mọi read của 8 Postgres adapter trên DB thật, rollback); Vitest 161; typecheck sạch
- [x] rls_checks 55/55, v2_checks 23/23, E2E 34/34 trên kiến trúc FastAPI
- [x] Lỗi thật tìm ra bằng E2E: `GET /me/saved-postings` 500 (alias SQL) + Server Action nuốt lỗi → đã sửa (ticket 28), integration test chặn lớp lỗi này
- [ ] `POST /me/company/logo` không xóa logo cũ khi đổi logo (file thừa trong bucket company-logos, không ảnh hưởng chức năng)
- Ghi chú vận hành: `next dev` chạy lâu có thể tự restart vì ngưỡng bộ nhớ ("approaching the used memory threshold") → E2E timeout giả; khởi động lại dev server trước khi demo

## Hiệu năng + giao diện (tickets 29–31, 2026-10-17)
- [x] API p50 (RTT ~104 ms tới pooler Tokyo): 520–1150 ms → 210–430 ms (`backend/scripts/bench.py`)
- [x] Trang (next dev): `/` 1,15 s → 0,56 s; `/jobs/[id]` 2,28 s → 0,72 s; `/companies` 0,80 → 0,45 s
- [x] Giao diện Layered & Depth; không tràn ngang ở 360px
- [x] E2E 45/45 (44 chức năng + 0 lỗi console/hydration); integration 10/10; rls 55/55; v2 23/23
- Còn có thể: chạy bản production (`next build && next start`) khi demo; chuyển Supabase sang region Singapore (RTT ~30 ms)

## v4 — Admin + redesign + production (tickets 32–38, 2026-10-18)
- [x] E2E 51 bước trên BẢN PRODUCTION (`next build && next start`): 51/51 chức năng PASS (gồm 7 bước admin: truy cập, xác minh công ty, ẩn/bỏ ẩn tin, khóa/mở khóa, nhật ký)
- [x] rls_checks 56/56 (thêm: tự đăng ký role ADMIN/role lạ bị chặn); integration 27/27 trên transaction pooler
- Lỗi thật tìm ra nhờ chạy production + E2E, đã sửa:
  - route `src/app/admin/users/'[id]'` (dấu nháy thừa) làm `next build` hỏng
  - `src/app/loading.tsx` gốc làm treo điều hướng chỉ đổi searchParams (phân trang, lọc)
  - `loading.tsx` ở `/jobs/[id]`, `/companies/[id]` → tin ẩn/không tồn tại trả HTTP 200 (soft 404; nội dung không lộ)
  - prefetch ~40 link/trang → quá tải API + lượt xem giả (ticket 36)
  - đồng hồ Supabase nhanh ~2 s → token mới bị 401 (`leeway=30`, ticket 37); endpoint công khai không sập vì token
  - kết nối pool đứt ngầm → API treo (ticket 35); session pooler chạm 15 client → chuyển transaction pooler 6543 (ticket 38)
- [ ] Cảnh báo hydration React #418 xuất hiện 1 lần ở `/jobs/[id]` trong E2E production, không tái hiện được trong 32 lượt tải thủ công — theo dõi tiếp
