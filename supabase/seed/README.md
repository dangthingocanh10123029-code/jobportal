# Dữ liệu demo (ticket 18)

Bộ dữ liệu hoàn toàn hư cấu, viết mới cho Job Portal: tên công ty, địa chỉ, mô tả, yêu cầu và quyền lợi đều được tạo ra cho demo, không lấy từ trang tuyển dụng nào.

| Thành phần | Số lượng |
|---|---|
| Công ty (Employer) | 40, logo `/images/companies/logo-01..24.svg`, website `https://<slug>.example` |
| Tin tuyển dụng | 302, phủ 16 ngành, 9 tỉnh/thành + Remote, đủ 7 cấp bậc; ~13% lương thỏa thuận, ~8% đã đóng, ~5% quá hạn, ~4% nháp |
| Ứng viên | 30, có tiêu đề hồ sơ, kỹ năng, kinh nghiệm, học vấn, CV mẫu |
| Đơn ứng tuyển | ~200, lịch sử trạng thái hợp lệ theo `application_transition_allowed` |
| Khác | tin đã lưu, lượt xem, thông báo (do trigger tạo, ngày giờ khớp lịch sử) |

## Chạy

Cần quyền `postgres` (connection string ở Supabase Dashboard → Project Settings → Database). Chạy từ gốc repo.

**Lần đầu trên một project:** seed, rồi upload CV mẫu.

```sh
psql "$DATABASE_URL" -f supabase/seed/seed-demo.sql
DATABASE_URL=... NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... supabase/seed/upload-demo-cvs.sh
```

**Các lần sau:** chỉ cần seed (CV mẫu vẫn còn trong storage).

```sh
psql "$DATABASE_URL" -f supabase/seed/seed-demo.sql   # tự xóa bộ demo cũ rồi tạo lại
psql "$DATABASE_URL" -f supabase/seed/wipe-demo.sql   # chỉ xóa
```

- Chạy lại bao nhiêu lần cũng không nhân đôi: seed gọi `wipe-demo.sql` trước, id sinh từ md5 nên cố định, `setseed` giữ nội dung giống nhau. Ngày tháng tính theo `now()`, nên chạy lại ngay trước buổi demo để hạn nộp còn mới.
- Wipe xóa mọi user `*@demo.jobportal.test` và mọi thứ của họ (tin, đơn, lịch sử, thông báo, tin đã lưu, lượt xem), cùng thông báo của người dùng thật trỏ tới đơn/tin demo bị xóa. Đơn của người dùng thật nộp vào tin demo cũng bị xóa theo tin.
- Wipe **không** đụng storage: xóa dòng `storage.objects` bằng SQL để lại file mồ côi. File tải lên trong lúc demo (CV nộp qua app, logo) nằm lại trong bucket; nếu cần dọn, xóa qua Dashboard → Storage.

### CV mẫu

Mỗi ứng viên demo có một CV cố định `resumes/<candidate_id>/demo-cv.pdf` (nội dung `sample-cv.pdf`); id ứng viên cố định nên file dùng lại được qua mọi lần wipe/seed, và đơn demo chỉ tham chiếu tới nó (`resume_path`).

`upload-demo-cvs.sh` đăng nhập từng ứng viên demo bằng mật khẩu chung (anon key, không cần service role) và upload CV vào thư mục của chính họ; ứng viên đã có CV thì bỏ qua, nên chạy lại an toàn. Cần `psql`, `curl`, `jq`. Seed in `WARNING: … chưa có CV trong storage` khi còn thiếu — chạy script là xong.

## Đăng nhập

Mật khẩu chung cho mọi tài khoản demo: **`DemoJob!2026`** (email đã xác nhận, không cần OTP).

| Vai trò | Email | Vì sao chọn |
|---|---|---|
| Employer | `doithong-erp@demo.jobportal.test` | Công ty TNHH Giải pháp Phần mềm Đồi Thông: 11 tin, nhiều đơn nhất, dashboard đầy đủ |
| Employer | `maybac-tech@demo.jobportal.test` | Công ty Cổ phần Công nghệ Mây Bạc: công ty IT, nhiều tin đang mở |
| Candidate | `ta.minh.chau@demo.jobportal.test` | Tạ Minh Châu: 8 đơn, đủ trạng thái từ Đã nộp tới Đã tuyển dụng / Đã rút hồ sơ |
| Candidate | `bui.thanh.tam@demo.jobportal.test` | Bùi Thanh Tâm: 9 đơn, có đơn được tuyển, nhiều thông báo |
| Admin | `admin@demo.jobportal.test` | Quản trị viên Demo: vào `/admin` (tổng quan, khóa người dùng, ẩn tin, xác minh công ty, nhật ký) |
| Candidate | `au.khai.hoan@demo.jobportal.test` | Âu Khải Hoàn: lập trình viên, hồ sơ IT, có đơn bị từ chối và đơn đã rút |

Email Employer là `<slug>@demo.jobportal.test`; email ứng viên là họ tên không dấu nối bằng dấu chấm. Bảng trên lấy từ lần chạy local (PostgreSQL 14); nếu trên Supabase thứ tự khác, tìm lại bằng:

```sql
select u.email, count(a.id) as applications
from public.job_postings p join auth.users u on u.id = p.employer_id
left join public.applications a on a.job_posting_id = p.id
where u.email like '%@demo.jobportal.test' group by 1 order by 2 desc limit 3;

select u.email, count(h.id) as status_changes
from public.applications a join auth.users u on u.id = a.candidate_id
join public.application_status_changes h on h.application_id = a.id
where u.email like '%@demo.jobportal.test' group by 1 order by 2 desc limit 3;
```

## Cấp quyền Admin (ticket 32)

Không ai tự đăng ký được vai trò ADMIN (`handle_new_user` chỉ nhận `CANDIDATE`/`EMPLOYER`). Cách duy nhất là chạy script với quyền `postgres`:

```sh
psql "$DATABASE_URL" -v email=ten@congty.vn -f supabase/seed/make-admin.sql
```

- Tài khoản phải tồn tại sẵn (đăng ký dạng Ứng viên trước). Script từ chối tài khoản Nhà tuyển dụng (Admin không được kiểm duyệt chính công ty/tin của mình) và xóa các trường hồ sơ ứng viên (headline, kỹ năng, kinh nghiệm, học vấn).
- Seed demo tự tạo sẵn `admin@demo.jobportal.test` (cùng mật khẩu chung) theo đúng cách này.
- Thu hồi quyền: không có script, cập nhật tay `update public.profiles set role = 'CANDIDATE' where id = …`.
