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

Cần quyền `postgres` (connection string ở Supabase Dashboard → Project Settings → Database). Chạy từ gốc repo:

```sh
psql "$DATABASE_URL" -f supabase/seed/seed-demo.sql   # tự xóa bộ demo cũ rồi tạo lại
psql "$DATABASE_URL" -f supabase/seed/wipe-demo.sql   # chỉ xóa
```

- Chạy lại bao nhiêu lần cũng không nhân đôi: seed gọi `wipe-demo.sql` trước, id sinh từ md5 nên cố định, `setseed` giữ nội dung giống nhau. Ngày tháng tính theo `now()`, nên chạy lại ngay trước buổi demo để hạn nộp còn mới.
- Wipe xóa mọi user `*@demo.jobportal.test` và mọi thứ của họ (tin, đơn, lịch sử, thông báo, tin đã lưu, lượt xem, file trong bucket `resumes`/`company-logos`). Đơn của người dùng thật nộp vào tin demo cũng bị xóa theo tin.

### Upload CV mẫu (một lần sau mỗi lần seed)

Seed tạo sẵn dòng `storage.objects` cho mỗi ứng viên (`resumes/<candidate_id>/<uuid>.pdf`), đủ để app nhận đơn hợp lệ. Để Employer mở được CV, upload nội dung file `sample-cv.pdf` vào đúng các đường dẫn đó:

```sh
psql "$DATABASE_URL" -Atc "select name from storage.objects where bucket_id = 'resumes'
  and owner_id in (select id::text from auth.users where email like '%@demo.jobportal.test')" |
while read -r path; do
  curl -sf -X POST "$SUPABASE_URL/storage/v1/object/resumes/$path" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Content-Type: application/pdf" -H "x-upsert: true" \
    --data-binary @supabase/seed/sample-cv.pdf >/dev/null && echo "ok $path"
done
```

## Đăng nhập

Mật khẩu chung cho mọi tài khoản demo: **`DemoJob!2026`** (email đã xác nhận, không cần OTP).

| Vai trò | Email | Vì sao chọn |
|---|---|---|
| Employer | `doithong-erp@demo.jobportal.test` | Công ty TNHH Giải pháp Phần mềm Đồi Thông: 11 tin, nhiều đơn nhất, dashboard đầy đủ |
| Employer | `maybac-tech@demo.jobportal.test` | Công ty Cổ phần Công nghệ Mây Bạc: công ty IT, nhiều tin đang mở |
| Candidate | `ta.minh.chau@demo.jobportal.test` | Tạ Minh Châu: 8 đơn, đủ trạng thái từ Đã nộp tới Đã tuyển dụng / Đã rút hồ sơ |
| Candidate | `bui.thanh.tam@demo.jobportal.test` | Bùi Thanh Tâm: 9 đơn, có đơn được tuyển, nhiều thông báo |
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
