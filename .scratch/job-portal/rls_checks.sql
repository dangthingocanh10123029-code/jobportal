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
select pg_temp.fails($$insert into auth.users (id, email, raw_user_meta_data) values (gen_random_uuid(), 'bad@test.local', '{"role":"ADMIN"}')$$, 'check', '01 role không hợp lệ bị chặn khi đăng ký');

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

rollback;
