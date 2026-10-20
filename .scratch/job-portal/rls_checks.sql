-- Manual checks for tickets 01–07, run as real roles with fake JWT claims. Everything is rolled back.
\set ON_ERROR_STOP 1
\set QUIET 1
begin;

create function pg_temp.as_user(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;

create function pg_temp.as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  execute 'set local role anon';
end $$;

create function pg_temp.ok(cond boolean, label text) returns void language plpgsql as $$
begin
  raise notice '% %', case when cond then 'PASS' else 'FAIL' end, label;
end $$;

-- Runs sql; PASS when it fails with a message matching pattern.
create function pg_temp.fails(sql text, pattern text, label text) returns void language plpgsql as $$
begin
  execute sql;
  raise notice 'FAIL % (no error)', label;
exception when others then
  raise notice '% % [%]', case when sqlerrm ~* pattern then 'PASS' else 'FAIL' end, label, sqlerrm;
end $$;

-- Fixed ids
create temp table ids as select
  '00000000-0000-4000-8000-0000000000e1'::uuid e1, '00000000-0000-4000-8000-0000000000e2'::uuid e2,
  '00000000-0000-4000-8000-0000000000c1'::uuid c1, '00000000-0000-4000-8000-0000000000c2'::uuid c2,
  '00000000-0000-4000-8000-0000000000a1'::uuid p_draft, '00000000-0000-4000-8000-0000000000a2'::uuid p_open,
  '00000000-0000-4000-8000-0000000000a3'::uuid p_closed, '00000000-0000-4000-8000-0000000000a4'::uuid p_expired;
grant select on ids to anon, authenticated;

-- ===== 01: sign-up trigger =====
insert into auth.users (id, email, raw_user_meta_data) values
  ((select e1 from ids), 'e1@test.local', '{"role":"EMPLOYER","company_name":"Công ty A"}'),
  ((select e2 from ids), 'e2@test.local', '{"role":"EMPLOYER","company_name":"Công ty B"}'),
  ((select c1 from ids), 'c1@test.local', '{"role":"CANDIDATE","full_name":"Ứng viên Một"}'),
  ((select c2 from ids), 'c2@test.local', '{"role":"CANDIDATE","full_name":"Ứng viên Hai"}');
select pg_temp.ok((select count(*) from profiles where id in (select unnest(array[e1,e2,c1,c2]) from ids)) = 4, '01 trigger tạo 4 profile');
select pg_temp.ok((select role from profiles where id = (select c1 from ids)) = 'CANDIDATE', '01 role CANDIDATE đúng');
select pg_temp.fails($$insert into auth.users (id, email, raw_user_meta_data) values (gen_random_uuid(), 'bad@test.local', '{"role":"ADMIN"}')$$, 'check|sign-up role', '01 tự đăng ký role ADMIN bị chặn');
select pg_temp.fails($$insert into auth.users (id, email, raw_user_meta_data) values (gen_random_uuid(), 'bad2@test.local', '{"role":"SUPERUSER"}')$$, 'check|sign-up role', '01 role lạ bị chặn khi đăng ký');

-- Postings as postgres (deadline fixtures need direct inserts)
insert into job_postings (id, employer_id, title, description, location, employment_type, salary_min, salary_max, application_deadline, status)
select p_draft, e1, 'Kế toán nháp', 'Mô tả đủ dài cho tin nháp kế toán', 'Hà Nội', 'FULL_TIME', null, null, now() + interval '30 days', 'DRAFT' from ids
union all select p_open, e1, 'Kế toán tổng hợp', 'Tuyển kế toán tổng hợp có kinh nghiệm', 'Đà Nẵng', 'FULL_TIME', 10000000, 20000000, now() + interval '30 days', 'PUBLISHED' from ids
union all select p_closed, e1, 'Nhân viên đã đóng', 'Mô tả đủ dài cho tin đã đóng tuyển', 'Hà Nội', 'PART_TIME', null, null, now() + interval '30 days', 'CLOSED' from ids
union all select p_expired, e2, 'Tin hết hạn', 'Mô tả đủ dài cho tin đã hết hạn nộp', 'Hà Nội', 'CONTRACT', null, 5000000, now() - interval '1 day', 'PUBLISHED' from ids;

-- ===== 01: profiles RLS =====
select pg_temp.as_user((select c1 from ids));
select pg_temp.ok((select count(*) from profiles) = 1, '01 RLS: Candidate chỉ đọc profile của mình');
select pg_temp.fails($$update profiles set role = 'EMPLOYER' where id = auth.uid()$$, 'permission denied', '01 không sửa được role');
update profiles set phone = '0901234567' where id = auth.uid();
select pg_temp.ok((select phone from profiles where id = auth.uid()) = '0901234567', '01 sửa được phone của mình');
reset role;
select pg_temp.as_anon();
select pg_temp.ok((select count(*) from employer_companies where employer_id in (select e1 from ids)) = 1, '01 anon đọc được employer_companies');
select pg_temp.fails($$select count(*) from profiles$$, 'permission denied', '01 anon không đọc được profiles');
reset role;

-- ===== 02: job_postings RLS + guard =====
select pg_temp.as_user((select e2 from ids));
select pg_temp.ok(not exists (select 1 from job_postings where id = (select p_draft from ids)), '02 Employer B không thấy DRAFT của A');
with u as (update job_postings set title = 'Hack hack' where id = (select p_open from ids) returning 1) select pg_temp.ok((select count(*) from u) = 0, '02 Employer B không sửa được tin của A');
reset role;
select pg_temp.as_user((select c1 from ids));
select pg_temp.fails($$insert into job_postings (title, description, location, employment_type, application_deadline) values ('Ứng viên đăng', 'Ứng viên không được đăng tin này', 'HN', 'FULL_TIME', now() + interval '1 day')$$, 'row-level security', '02 Candidate không tạo được tin');
reset role;
select pg_temp.as_user((select e1 from ids));
insert into job_postings (title, description, location, employment_type, application_deadline)
  values ('Tin mới của A', 'Mô tả đủ dài cho tin mới của A', 'HCM', 'INTERN' || 'SHIP', now() + interval '10 days');
select pg_temp.ok((select status from job_postings where title = 'Tin mới của A') = 'DRAFT', '02 Employer tạo tin mặc định DRAFT');
select pg_temp.fails($$insert into job_postings (title, description, location, employment_type, application_deadline, status) values ('Tin publish thẳng', 'Không được insert PUBLISHED trực tiếp', 'HCM', 'FULL_TIME', now() + interval '1 day', 'PUBLISHED')$$, 'permission denied|row-level security', '02 không insert thẳng PUBLISHED');
select pg_temp.fails($$update job_postings set title = 'Sửa tin đã đóng' where id = (select p_closed from ids)$$, 'CLOSED', '02 trigger chặn sửa tin CLOSED');
select pg_temp.fails($$update job_postings set status = 'CLOSED' where id = (select p_draft from ids)$$, 'invalid status transition', '02 trigger chặn DRAFT -> CLOSED');
update job_postings set application_deadline = now() - interval '1 hour' where title = 'Tin mới của A';
select pg_temp.fails($$update job_postings set status = 'PUBLISHED' where title = 'Tin mới của A'$$, 'future', '02 trigger chặn đăng tin deadline quá khứ');
select pg_temp.fails($$update job_postings set salary_min = 9, salary_max = 1 where id = (select p_draft from ids)$$, 'salary_range', '02 CHECK salary_min <= salary_max');
reset role;

-- ===== 02/03: anon read side =====
select pg_temp.as_anon();
select pg_temp.ok(not exists (select 1 from job_postings where id = (select p_draft from ids)), '03 anon không đọc được DRAFT');
select pg_temp.ok(exists (select 1 from job_postings where id = (select p_closed from ids)), '03 anon đọc được CLOSED');
select pg_temp.ok((select company_name from job_postings_with_company where id = (select p_open from ids)) = 'Công ty A', '02 view job_postings_with_company trả companyName cho anon');
select pg_temp.ok(
  exists (select 1 from open_job_postings where id = (select p_open from ids))
  and not exists (select 1 from open_job_postings where id in (select unnest(array[p_draft, p_closed, p_expired]) from ids)),
  '03 open_job_postings chỉ có tin PUBLISHED chưa hết hạn');
reset role;
select pg_temp.as_user((select e1 from ids));
select pg_temp.ok(exists (select 1 from job_postings where id = (select p_draft from ids)), '03 owner vẫn thấy DRAFT của mình');
reset role;

-- ===== 04: search =====
select pg_temp.ok(f_unaccent('Đà Nẵng KẾ TOÁN Ưu đãi Ỹ') = 'da nang ke toan uu dai y', '04 f_unaccent bỏ dấu + đ/Đ + lower');
select pg_temp.as_anon();
select pg_temp.ok((select count(*) from open_job_postings where search_text ilike '%ke toan%' and id in (select p_open from ids)) = 1, '04 tìm "ke toan" không dấu khớp "Kế toán"');
select pg_temp.ok((select count(*) from open_job_postings where search_location ilike '%nang%' and id in (select p_open from ids)) = 1, '04 location contains "nang" khớp "Đà Nẵng"');
select pg_temp.ok((select count(*) from open_job_postings where search_text ilike '%50\%%' and id in (select p_open from ids)) = 0, '04 ký tự % được escape');
reset role;

-- ===== 05: storage + submit RPC =====
select pg_temp.as_user((select c1 from ids));
insert into storage.objects (bucket_id, name, owner) values ('resumes', (select c1 from ids)::text || '/cv.pdf', (select c1 from ids));
select pg_temp.fails(format($$insert into storage.objects (bucket_id, name) values ('resumes', '%s/cv.pdf')$$, (select c2 from ids)), 'row-level security', '05 Candidate không upload vào thư mục người khác');
select pg_temp.fails(format($$select submit_application('%s', '%s/cv.pdf')$$, (select p_open from ids), (select c2 from ids)), 'INVALID_RESUME', '05 RPC chặn CV ở thư mục người khác');
select pg_temp.fails(format($$select submit_application('%s', '%s/cv.pdf')$$, (select p_closed from ids), (select c1 from ids)), 'POSTING_NOT_OPEN', '05 RPC chặn tin CLOSED');
select pg_temp.fails(format($$select submit_application('%s', '%s/cv.pdf')$$, (select p_expired from ids), (select c1 from ids)), 'POSTING_NOT_OPEN', '05 RPC chặn tin hết hạn');
select pg_temp.fails(format($$select submit_application('%s', '%s/cv.pdf')$$, (select p_draft from ids), (select c1 from ids)), 'POSTING_NOT_OPEN', '05 RPC chặn tin DRAFT');
select pg_temp.ok((select (submit_application((select p_open from ids), (select c1 from ids)::text || '/cv.pdf')).status) = 'SUBMITTED', '05 nộp đơn thành công -> SUBMITTED');
select pg_temp.ok((select count(*) from application_status_changes) = 1, '05 có đúng 1 Status Change đầu tiên');
select pg_temp.fails(format($$select submit_application('%s', '%s/cv.pdf')$$, (select p_open from ids), (select c1 from ids)), 'ALREADY_APPLIED', '05 nộp trùng bị chặn');
select pg_temp.fails($$insert into applications (job_posting_id, candidate_id, resume_path) values ((select p_open from ids), auth.uid(), 'x')$$, 'permission denied', '05 không insert applications trực tiếp');
select pg_temp.fails($$delete from application_status_changes$$, 'permission denied', '05 history append-only (không xóa)');
select pg_temp.fails($$delete from storage.objects where bucket_id = 'resumes'$$, 'Storage API', '05 (chỉ ghi nhận) Supabase chặn xóa storage bằng SQL — policy delete phải thử qua Storage API');
reset role;
select pg_temp.as_user((select e1 from ids));
select pg_temp.fails($$select submit_application((select p_open from ids), 'x/cv.pdf')$$, 'Candidate', '05 Employer không nộp đơn được');
reset role;

-- ===== 06: candidate side =====
select pg_temp.as_user((select c2 from ids));
select pg_temp.ok((select count(*) from applications) = 0 and (select count(*) from candidate_application_summaries) = 0, '06 Candidate khác không thấy đơn của C1');
select pg_temp.fails(format($$select change_application_status((select id from applications limit 1), 'WITHDRAWN')$$), 'APPLICATION_NOT_FOUND|null', '06 (C2 không thấy đơn để rút)');
reset role;
create temp table app as select id from applications where candidate_id = (select c1 from ids);
grant select on app to anon, authenticated;
select pg_temp.as_user((select c2 from ids));
select pg_temp.fails($$select change_application_status((select id from app), 'WITHDRAWN')$$, 'APPLICATION_NOT_FOUND', '06 C2 không rút được đơn của C1');
reset role;
select pg_temp.as_user((select c1 from ids));
select pg_temp.ok((select posting_title from candidate_application_summaries) = 'Kế toán tổng hợp', '06 view candidate_application_summaries trả tiêu đề tin');
select pg_temp.fails($$select change_application_status((select id from app), 'REVIEWING')$$, 'INVALID_TRANSITION', '06 Candidate không chuyển sang REVIEWING');
reset role;

-- ===== 07: employer side =====
select pg_temp.as_user((select e2 from ids));
select pg_temp.ok((select count(*) from employer_application_summaries) = 0 and (select count(*) from applications) = 0, '07 Employer B không thấy đơn trên tin của A');
select pg_temp.fails($$select change_application_status((select id from app), 'REVIEWING')$$, 'APPLICATION_NOT_FOUND', '07 Employer B không đổi trạng thái đơn của A');
select pg_temp.ok((select count(*) from storage.objects where bucket_id = 'resumes') = 0, '07 Employer B không đọc được CV');
reset role;
select pg_temp.as_user((select e1 from ids));
select pg_temp.ok((select candidate_name from employer_application_summaries) = 'Ứng viên Một' and (select candidate_phone from employer_application_summaries) = '0901234567', '07 Employer A thấy tên + SĐT ứng viên');
select pg_temp.ok((select count(*) from storage.objects where bucket_id = 'resumes') = 1, '07 Employer A đọc được CV (ký URL được)');
select pg_temp.ok((select (change_application_status((select id from app), 'REVIEWING')).status) = 'REVIEWING', '07 Employer A chuyển SUBMITTED -> REVIEWING');
select pg_temp.fails($$select change_application_status((select id from app), 'WITHDRAWN')$$, 'INVALID_TRANSITION', '07 Employer không chuyển sang WITHDRAWN');
select pg_temp.fails($$select change_application_status((select id from app), 'HIRED')$$, 'INVALID_TRANSITION', '07 Employer không nhảy cóc REVIEWING -> HIRED');
reset role;
select pg_temp.as_user((select c1 from ids));
select pg_temp.ok((select count(*) from application_status_changes) = 2, '07 Candidate thấy Status Change mới của Employer');
select pg_temp.ok((select (change_application_status((select id from app), 'WITHDRAWN')).status) = 'WITHDRAWN', '06 Candidate rút đơn ở REVIEWING');
select pg_temp.fails($$select change_application_status((select id from app), 'WITHDRAWN')$$, 'INVALID_TRANSITION', '06 rút lại đơn đã WITHDRAWN bị chặn');
reset role;
select pg_temp.as_anon();
select pg_temp.fails($$select submit_application((select p_open from ids), 'x')$$, 'permission denied', '05 anon không gọi được RPC submit');
reset role;

-- ===== 40: interviews (cần migration 20261020000100_interviews.sql) =====
insert into storage.objects (bucket_id, name) select 'resumes', c2 || '/cv.pdf' from ids;
create temp table app2 as
  with ins as (insert into applications (job_posting_id, candidate_id, resume_path)
               select p_open, c2, c2 || '/cv.pdf' from ids returning id) select id from ins;
grant select on app2 to authenticated;
create temp table iv (id uuid);
grant select, insert on iv to authenticated;
select pg_temp.as_user((select e1 from ids));
select pg_temp.ok((select (change_application_status((select id from app2), 'REVIEWING')).status) = 'REVIEWING', '40 chuẩn bị: đơn c2 REVIEWING');
insert into iv select id from schedule_interview((select id from app2), now() + interval '1 day', 60, 'ONLINE', 'https://meet.example/x');
select pg_temp.ok((select status from applications where id = (select id from app2)) = 'INTERVIEWING', '40 đặt lịch chuyển đơn REVIEWING -> INTERVIEWING');
select pg_temp.fails($$select schedule_interview((select id from app2), now() + interval '2 days', 60, 'ONLINE', 'https://meet.example/y')$$, 'INTERVIEW_ALREADY_PENDING', '40 không có 2 lịch PROPOSED/CONFIRMED cùng đơn');
select pg_temp.fails($$select schedule_interview((select id from app2), now() - interval '1 hour', 60, 'ONLINE', 'https://meet.example/y')$$, 'INVALID_SCHEDULE_TIME', '40 giờ phỏng vấn trong quá khứ bị chặn');
select pg_temp.fails($$update interviews set status = 'DONE'$$, 'permission denied', '40 Employer không update interviews trực tiếp');
reset role;
select pg_temp.as_user((select e2 from ids));
select pg_temp.ok((select count(*) from interview_details) = 0 and (select count(*) from interviews) = 0, '40 RLS: Employer khác không thấy lịch');
select pg_temp.fails($$select cancel_interview((select id from iv))$$, 'INTERVIEW_NOT_FOUND', '40 Employer khác không hủy được lịch');
reset role;
select pg_temp.as_user((select c1 from ids));
select pg_temp.ok((select count(*) from interview_details) = 0, '40 RLS: Candidate khác không thấy lịch');
select pg_temp.fails($$select respond_interview((select id from iv), 'CONFIRM')$$, 'INTERVIEW_NOT_FOUND', '40 Candidate khác không trả lời được');
reset role;
select pg_temp.as_user((select c2 from ids));
select pg_temp.ok((select company_name from interview_details) = 'Công ty A', '40 Candidate của đơn thấy lịch + tên công ty');
select pg_temp.fails($$select respond_interview((select id from iv), 'RESCHEDULE', ' ')$$, 'RESCHEDULE_NOTE_REQUIRED', '40 xin đổi giờ bắt buộc ghi chú');
select pg_temp.ok((select (respond_interview((select id from iv), 'CONFIRM')).status) = 'CONFIRMED', '40 Candidate xác nhận lịch');
select pg_temp.fails($$select mark_interview_done((select id from iv))$$, 'INTERVIEW_NOT_FOUND', '40 Candidate không đánh dấu đã phỏng vấn');
reset role;
select pg_temp.as_user((select e1 from ids));
select pg_temp.fails($$select mark_interview_done((select id from iv))$$, 'INTERVIEW_NOT_DUE', '40 chưa tới giờ hẹn thì không đánh dấu DONE');
select pg_temp.ok((select (cancel_interview((select id from iv), 'Đổi kế hoạch')).status) = 'CANCELLED', '40 Employer hủy lịch đã xác nhận');
reset role;
select pg_temp.ok((select count(*) from notifications where type like 'INTERVIEW_%') = 3, '40 thông báo: đặt lịch, trả lời, hủy');
select pg_temp.as_anon();
select pg_temp.fails($$select count(*) from interview_details$$, 'permission denied', '40 anon không đọc interview_details');
reset role;
-- ===== 46: articles (run after 20261020000700_articles.sql) =====
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-4000-8000-0000000000ad', 'ad@test.local', '{"role":"CANDIDATE","full_name":"Quản trị"}');
update profiles set role = 'ADMIN' where id = '00000000-0000-4000-8000-0000000000ad';
create temp table art (id uuid);
grant select, insert on art to authenticated;
select pg_temp.as_user('00000000-0000-4000-8000-0000000000ad');
insert into art select admin_save_article(null, 'Bài kiểm tra RLS', 'bai-kiem-tra-rls', 'Tóm tắt đủ hai mươi ký tự', 'CV', repeat('nội dung ', 30));
select admin_save_article(null, 'Bài kiểm tra RLS', 'bai-kiem-tra-rls', 'Tóm tắt đủ hai mươi ký tự', 'CV', repeat('nội dung ', 30));
select pg_temp.ok(exists (select 1 from articles where slug = 'bai-kiem-tra-rls-2'), '46 slug trùng được thêm -2');
reset role;
select pg_temp.as_anon();
select pg_temp.ok((select count(*) from articles where slug like 'bai-kiem-tra-rls%') = 0, '46 anon không thấy bản nháp');
select pg_temp.fails($$select admin_save_article(null, 'Tiêu đề', 'tieu-de', 'Tóm tắt đủ hai mươi ký tự', 'CV', repeat('x ', 60))$$, 'permission denied', '46 anon không gọi được admin_save_article');
reset role;
select pg_temp.as_user((select c1 from ids));
select pg_temp.fails($$select admin_set_article_published((select id from art), true)$$, 'NOT_ADMIN', '46 Candidate không đăng bài được');
select pg_temp.fails($$update articles set views = 1$$, 'permission denied', '46 không sửa trực tiếp bảng articles');
reset role;
select pg_temp.as_user('00000000-0000-4000-8000-0000000000ad');
select admin_set_article_published((select id from art), true);
reset role;
select pg_temp.as_anon();
select increment_article_views('bai-kiem-tra-rls');
select pg_temp.ok((select views from articles where slug = 'bai-kiem-tra-rls') = 1, '46 anon thấy bài đã đăng, tăng lượt xem');
reset role;
select pg_temp.ok((select count(*) from admin_audit_log where action = 'ARTICLE_PUBLISHED' and target_type = 'ARTICLE' and target_id = (select id from art)) = 1, '46 đăng bài ghi audit');

-- ===== 41: messages (cần migration 20261020000200_messages.sql; dùng đơn app2 của c2 trên tin của e1) =====
create temp table n41 as select count(*) n from notifications;
select pg_temp.as_user((select e1 from ids));
select pg_temp.ok((select (send_message((select id from app2), '  Chào bạn  ')).body) = 'Chào bạn', '41 Employer gửi tin (đã trim)');
select pg_temp.fails($$select send_message((select id from app2), '   ')$$, 'INVALID_MESSAGE', '41 tin rỗng bị chặn');
select pg_temp.fails($$insert into messages (application_id, sender_id, body) select id, auth.uid(), 'x' from app2$$, 'permission denied', '41 không insert messages trực tiếp');
reset role;
select pg_temp.as_user((select c2 from ids));
select pg_temp.ok((select unread from conversations where application_id = (select id from app2)) = 1, '41 Candidate thấy 1 tin chưa đọc');
select pg_temp.ok((select other_party_name from conversations where application_id = (select id from app2)) = 'Công ty A', '41 Candidate thấy tên công ty');
select pg_temp.ok((select (send_message((select id from app2), 'Dạ vâng')).sender_id) = (select c2 from ids), '41 Candidate trả lời');
select mark_conversation_read((select id from app2));
select pg_temp.ok((select count(*) from messages where read_at is null and sender_id <> auth.uid()) = 0, '41 đánh dấu đã đọc');
select pg_temp.fails($$update messages set read_at = null$$, 'permission denied', '41 không update messages trực tiếp');
reset role;
select pg_temp.as_user((select e2 from ids));
select pg_temp.ok((select count(*) from messages) = 0 and (select count(*) from conversations where application_id = (select id from app2)) = 0, '41 RLS: Employer khác không thấy tin');
select pg_temp.fails($$select send_message((select id from app2), 'x')$$, 'APPLICATION_NOT_FOUND', '41 Employer khác không gửi được');
reset role;
select pg_temp.as_user((select c1 from ids));
select pg_temp.ok((select count(*) from messages) = 0, '41 RLS: Candidate khác không thấy tin');
select pg_temp.fails($$select mark_conversation_read((select id from app2))$$, 'APPLICATION_NOT_FOUND', '41 Candidate khác không đánh dấu đọc được');
reset role;
select pg_temp.ok((select count(*) from notifications) = (select n from n41), '41 không tạo thông báo cho tin nhắn');
select pg_temp.as_user((select c2 from ids));
select pg_temp.ok((select (change_application_status((select id from app2), 'WITHDRAWN')).status) = 'WITHDRAWN', '41 chuẩn bị: c2 rút đơn');
select pg_temp.fails($$select send_message((select id from app2), 'x')$$, 'CONVERSATION_CLOSED', '41 đơn đã kết thúc thì không gửi được');
select pg_temp.ok((select not can_send from conversations where application_id = (select id from app2)), '41 conversations.can_send = false');
reset role;
select pg_temp.as_anon();
select pg_temp.fails($$select count(*) from messages$$, 'permission denied', '41 anon không đọc messages');
select pg_temp.fails($$select send_message(gen_random_uuid(), 'x')$$, 'permission denied', '41 anon không gọi được send_message');
reset role;

-- ===== 42: online CV (cần migration 20261020000300_online_cv.sql; c1 nộp ONLINE vào p_open sau khi đơn cũ bị xóa) =====
select pg_temp.as_user((select c1 from ids));
select pg_temp.fails(format($$select submit_application('%s', null, 'ONLINE')$$, (select p_open from ids)), 'CV_NOT_FOUND', '42 chưa có CV online thì không nộp ONLINE được');
insert into candidate_cvs (candidate_id, template, full_name, email, experiences)
  values (auth.uid(), 'CLASSIC', 'Ứng viên Một', 'c1@example.vn', '[{"title":"Kế toán","organization":"ACME","start_date":"2020-01","end_date":null,"description":""}]');
select pg_temp.ok((select count(*) from candidate_cvs) = 1, '42 Candidate tạo và đọc CV của mình');
select pg_temp.fails($$insert into candidate_cvs (candidate_id, template, full_name, email, skills) values (auth.uid(), 'CLASSIC', 'A', 'a@b.vn', array_fill('x'::text, array[31]))$$, 'check|duplicate', '42 CHECK giới hạn (hoặc trùng 1 CV/người)');
select pg_temp.fails($$update candidate_cvs set experiences = (select jsonb_agg(e) from generate_series(1, 16) e)$$, 'check', '42 CHECK tối đa 15 kinh nghiệm');
reset role;
delete from applications where id in (select id from app);
select pg_temp.as_user((select c1 from ids));
select pg_temp.ok((select (submit_application((select p_open from ids), null, 'ONLINE')).cv_source) = 'ONLINE', '42 nộp đơn bằng CV online');
update candidate_cvs set full_name = 'Tên Mới';
reset role;
select pg_temp.as_user((select c2 from ids));
select pg_temp.ok((select count(*) from candidate_cvs) = 0, '42 RLS: Candidate khác không thấy CV');
with u as (update candidate_cvs set full_name = 'x' returning 1) select pg_temp.ok((select count(*) from u) = 0, '42 RLS: Candidate khác không sửa được CV');
reset role;
select pg_temp.as_user((select e1 from ids));
select pg_temp.ok((select count(*) from candidate_cvs) = 0, '42 Employer không đọc bảng candidate_cvs');
select pg_temp.fails($$insert into candidate_cvs (candidate_id, template, full_name, email) values (auth.uid(), 'CLASSIC', 'A', 'a@b.vn')$$, 'row-level security', '42 Employer không tạo CV');
select pg_temp.ok((select online_cv ->> 'full_name' from employer_application_summaries where candidate_id = (select c1 from ids)) = 'Ứng viên Một', '42 Employer chủ tin thấy bản chụp lúc nộp (không đổi khi sửa CV)');
reset role;
select pg_temp.as_user((select e2 from ids));
select pg_temp.ok((select count(*) from employer_application_summaries where cv_source = 'ONLINE') = 0, '42 Employer khác không thấy bản chụp');
reset role;
select pg_temp.fails($$update applications set online_cv = '{}' where cv_source = 'ONLINE'$$, 'fixed', '42 bản chụp CV không sửa được');
select pg_temp.as_anon();
select pg_temp.fails($$select count(*) from candidate_cvs$$, 'permission denied', '42 anon không đọc candidate_cvs');
-- ===== 45: company reviews (cần migration 20261020000750_company_reviews.sql; c2 có đơn app2 vào tin của e1, admin 'ad' của mục 46) =====
create temp table rv (id uuid);
grant select, insert on rv to authenticated;
grant select on rv to anon;
select pg_temp.as_user((select c2 from ids));
select pg_temp.ok(can_review_company((select e1 from ids)), '45 c2 từng nộp đơn vào e1 → được đánh giá');
insert into rv select submit_review((select e1 from ids), 4, '  Môi trường tốt  ', 'Đồng nghiệp thân thiện', 'Lương hơi thấp', true);
select pg_temp.ok((select status from company_reviews where id = (select id from rv)) = 'PENDING', '45 review mới ở PENDING (đã trim)');
select pg_temp.fails($$select submit_review((select e1 from ids), 5, 'Viết lần hai', 'Ưu điểm đủ dài', 'Nhược điểm đủ dài', false)$$, 'REVIEW_EXISTS', '45 mỗi công ty 1 review');
select pg_temp.fails($$select submit_review((select e2 from ids), 5, 'Chưa ứng tuyển', 'Ưu điểm đủ dài', 'Nhược điểm đủ dài', false)$$, 'NOT_ELIGIBLE', '45 chưa ứng tuyển thì không đánh giá');
select pg_temp.fails($$select submit_review((select e1 from ids), 6, 'Tiêu đề hợp lệ', 'Ưu điểm đủ dài', 'Nhược điểm đủ dài', false)$$, 'INVALID_REVIEW', '45 sao ngoài 1–5 bị chặn');
select pg_temp.fails($$update company_reviews set status = 'APPROVED'$$, 'permission denied', '45 không tự duyệt review');
select pg_temp.fails($$select admin_moderate_review((select id from rv), true)$$, 'NOT_ADMIN', '45 Candidate không kiểm duyệt được');
reset role;
select pg_temp.as_user((select c1 from ids));
select pg_temp.ok((select count(*) from company_reviews) = 0, '45 RLS: Candidate khác không thấy review của c2');
reset role;
select pg_temp.as_anon();
select pg_temp.ok((select count(*) from company_reviews_public where company_id = (select e1 from ids)) = 0, '45 review PENDING chưa công khai');
select pg_temp.fails($$select count(*) from company_reviews$$, 'permission denied', '45 anon không đọc bảng gốc');
reset role;
select pg_temp.as_user('00000000-0000-4000-8000-0000000000ad');
select pg_temp.fails($$select admin_moderate_review((select id from rv), false, 'abc')$$, 'INVALID_REASON', '45 từ chối cần lý do 5–500');
select admin_moderate_review((select id from rv), true);
reset role;
select pg_temp.ok((select count(*) from admin_audit_log where action = 'REVIEW_APPROVED' and target_type = 'REVIEW' and target_id = (select id from rv)) = 1, '45 duyệt ghi audit');
select pg_temp.ok((select count(*) from notifications where recipient_id = (select c2 from ids) and type = 'REVIEW_MODERATED') = 1, '45 duyệt gửi thông báo cho tác giả');
select pg_temp.as_anon();
select pg_temp.ok((select author_name from company_reviews_public where id = (select id from rv)) = 'Ứng viên ẩn danh', '45 anon thấy review đã duyệt, tên ẩn danh');
select pg_temp.ok(not exists (select 1 from information_schema.columns where table_name = 'company_reviews_public' and column_name = 'candidate_id'), '45 view công khai không có candidate_id');
select pg_temp.ok((select (rating, review_count) = (4.0::float8, 1) from company_summaries where id = (select e1 from ids)), '45 company_summaries có rating/review_count');
reset role;

-- ===== 43: talent search (cần migration 20261020000400_talent.sql) =====
insert into job_postings (id, employer_id, title, description, location, employment_type, application_deadline, status)
  select '00000000-0000-4000-8000-0000000000b3', e1, 'Tin mời ứng viên', 'Mô tả đủ dài cho tin mời ứng viên', 'Hà Nội', 'FULL_TIME', now() + interval '30 days', 'PUBLISHED' from ids;
select pg_temp.as_user((select c1 from ids));
update profiles set open_to_work = true, location = 'Hà Nội', experience_years = 3, phone = '0901234567' where id = auth.uid();
select pg_temp.fails($$update profiles set experience_years = 51 where id = auth.uid()$$, 'check', '43 CHECK số năm kinh nghiệm 0–50');
with u as (update profiles set open_to_work = true where id = (select c2 from ids) returning 1) select pg_temp.ok((select count(*) from u) = 0, '43 Candidate không bật openToWork của người khác');
select pg_temp.ok((select count(*) from talent_profiles) = 0, '43 Candidate không đọc talent_profiles');
select pg_temp.fails($$select invite_talent((select c2 from ids), (select p_open from ids))$$, 'TALENT_NOT_FOUND', '43 Candidate không mời được');
reset role;
select pg_temp.as_user((select e1 from ids));
select pg_temp.fails($$update profiles set open_to_work = true where id = auth.uid()$$, 'check', '43 Employer không có openToWork');
select pg_temp.ok((select array_agg(candidate_id) from talent_profiles where candidate_id in (select c1 from ids union all select c2 from ids)) = array[(select c1 from ids)], '43 Employer chỉ thấy ứng viên bật openToWork');
select pg_temp.ok(not exists (select 1 from information_schema.columns where table_name = 'talent_profiles' and column_name in ('email', 'phone')), '43 talent_profiles không có cột email/phone');
select pg_temp.ok((select not coalesce(to_jsonb(t) ? 'phone' or cv ? 'email' or cv ? 'phone', false) from talent_profiles t where candidate_id = (select c1 from ids)), '43 không lộ phone/email (kể cả trong cv)');
insert into saved_candidates (employer_id, candidate_id) select auth.uid(), c1 from ids;
select pg_temp.ok((select saved from talent_profiles where candidate_id = (select c1 from ids)) and (select count(*) from saved_candidates) = 1, '43 Employer lưu ứng viên');
select pg_temp.fails($$insert into saved_candidates (employer_id, candidate_id) select auth.uid(), c2 from ids$$, 'row-level security', '43 không lưu ứng viên đang ẩn');
select pg_temp.fails($$insert into saved_candidates (employer_id, candidate_id) select e2, c1 from ids$$, 'row-level security', '43 không lưu thay Employer khác');
select invite_talent((select c1 from ids), '00000000-0000-4000-8000-0000000000b3', 'Mời bạn');
select pg_temp.fails($$select invite_talent((select c1 from ids), '00000000-0000-4000-8000-0000000000b3')$$, 'ALREADY_INVITED', '43 mời trùng (ứng viên, tin) bị chặn');
select pg_temp.fails($$select invite_talent((select c1 from ids), (select p_draft from ids))$$, 'POSTING_NOT_OPEN', '43 không mời vào tin nháp');
select pg_temp.fails($$select invite_talent((select c1 from ids), (select p_expired from ids))$$, 'POSTING_NOT_OPEN', '43 không mời vào tin của Employer khác (đã hết hạn)');
select pg_temp.fails($$insert into talent_invitations (employer_id, candidate_id, posting_id) select e1, c1, p_open from ids$$, 'permission denied', '43 không ghi talent_invitations trực tiếp');
reset role;
insert into job_postings (employer_id, title, description, location, employment_type, application_deadline, status)
  select e1, 'Tin giới hạn ' || n, 'Mô tả đủ dài cho tin kiểm tra giới hạn', 'Hà Nội', 'FULL_TIME', now() + interval '30 days', 'PUBLISHED'
  from ids, generate_series(1, 20) n;
insert into talent_invitations (employer_id, candidate_id, posting_id)
  select e1, c1, id from job_postings, ids where title like 'Tin giới hạn %' and title <> 'Tin giới hạn 20';
select pg_temp.as_user((select e1 from ids));
select pg_temp.fails($$select invite_talent((select c1 from ids), (select id from job_postings where title = 'Tin giới hạn 20'))$$, 'INVITE_LIMIT', '43 tối đa 20 lời mời / 24 giờ');
reset role;
select pg_temp.ok((select count(*) from notifications where recipient_id = (select c1 from ids) and type = 'TALENT_INVITED' and link = '/jobs/00000000-0000-4000-8000-0000000000b3') = 1, '43 lời mời tạo notification TALENT_INVITED');
select pg_temp.as_user((select e2 from ids));
select pg_temp.ok((select count(*) from saved_candidates) = 0 and (select count(*) from talent_invitations) = 0, '43 Employer khác không thấy lưu/lời mời của A');
reset role;
select pg_temp.as_user((select c1 from ids));
select pg_temp.ok((select count(*) from talent_invitations) = 20, '43 Candidate thấy lời mời của mình (20 lời mời từ A)');
update profiles set open_to_work = false where id = auth.uid();
reset role;
select pg_temp.as_user((select e1 from ids));
select pg_temp.ok((select count(*) from talent_profiles where candidate_id = (select c1 from ids)) = 0, '43 tắt openToWork thì biến mất khỏi tìm kiếm');
reset role;
update profiles set open_to_work = true where id = (select c1 from ids);
update profiles set locked_at = now(), locked_reason = 'Kiểm tra khóa' where id = (select c1 from ids);
select pg_temp.as_user((select e1 from ids));
select pg_temp.ok((select count(*) from talent_profiles where candidate_id = (select c1 from ids)) = 0, '43 tài khoản bị khóa không xuất hiện');
reset role;
select pg_temp.as_anon();
select pg_temp.fails($$select count(*) from talent_profiles$$, 'permission denied', '43 anon không đọc talent_profiles');
select pg_temp.fails($$select count(*) from saved_candidates$$, 'permission denied', '43 anon không đọc saved_candidates');
reset role;

rollback;
