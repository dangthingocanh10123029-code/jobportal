-- v2 checks (tickets 15–17) as real roles with fake JWT claims. Everything is rolled back.
-- Run: psql "<session pooler URL>" -q -At -f .scratch/job-portal/v2_checks.sql
\set ON_ERROR_STOP 1
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
begin raise notice '% %', case when cond then 'PASS' else 'FAIL' end, label; end $$;
create function pg_temp.fails(sql text, pattern text, label text) returns void language plpgsql as $$
begin
  execute sql;
  raise notice 'FAIL % (no error)', label;
exception when others then
  raise notice '% % [%]', case when sqlerrm ~* pattern then 'PASS' else 'FAIL' end, label, sqlerrm;
end $$;

create temp table ids as select
  '00000000-0000-4000-8000-0000000000e1'::uuid e1, '00000000-0000-4000-8000-0000000000e2'::uuid e2,
  '00000000-0000-4000-8000-0000000000c1'::uuid c1, '00000000-0000-4000-8000-0000000000c2'::uuid c2,
  '00000000-0000-4000-8000-0000000000a2'::uuid p_open;
grant select on ids to anon, authenticated;

insert into auth.users (id, email, raw_user_meta_data) values
  ((select e1 from ids), 'v2e1@test.local', '{"role":"EMPLOYER","company_name":"Công ty A"}'),
  ((select e2 from ids), 'v2e2@test.local', '{"role":"EMPLOYER","company_name":"Công ty B"}'),
  ((select c1 from ids), 'v2c1@test.local', '{"role":"CANDIDATE","full_name":"Ứng viên Một"}'),
  ((select c2 from ids), 'v2c2@test.local', '{"role":"CANDIDATE","full_name":"Ứng viên Hai"}');
insert into job_postings (id, employer_id, title, description, location, employment_type, application_deadline, status, industry, skills)
select p_open, e1, 'Kế toán v2', 'Mô tả đủ dài cho tin kiểm tra v2', 'Đà Nẵng', 'FULL_TIME', now() + interval '30 days', 'PUBLISHED', 'ACCOUNTING_FINANCE', '{Excel,MISA}' from ids;

-- 15: companies
select pg_temp.ok((select count(*) from companies where id in (select unnest(array[e1, e2]) from ids)) = 2, '15 trigger tạo companies cho Employer mới');
select pg_temp.ok(not exists (select 1 from companies where id = (select c1 from ids)), '15 Candidate không có dòng companies');
select pg_temp.as_anon();
select pg_temp.ok((select name from companies where id = (select e1 from ids)) = 'Công ty A', '15 anon đọc được companies');
select pg_temp.ok((select company_name from job_postings_with_company where id = (select p_open from ids)) = 'Công ty A', '15 tin lấy tên từ companies');
reset role;
select pg_temp.as_user((select e2 from ids));
with u as (update companies set about = 'hack' where id = (select e1 from ids) returning 1)
select pg_temp.ok((select count(*) from u) = 0, '15 Employer B không sửa được công ty A');
update companies set name = 'Công ty B mới', website = 'https://b.example' where id = auth.uid();
reset role;
select pg_temp.ok((select company_name from profiles where id = (select e2 from ids)) = 'Công ty B mới', '15 đổi tên công ty đồng bộ profiles.company_name');
select pg_temp.as_user((select e2 from ids));
select pg_temp.fails($$update companies set website = 'javascript:alert(1)' where id = auth.uid()$$, 'check', '15 website javascript: bị CHECK chặn');
select pg_temp.fails($$update companies set logo_url = 'https://evil.example/x.png' where id = auth.uid()$$, 'check', '15 logo_url ngoài bucket bị chặn');
reset role;

-- 16: saved postings + candidate profile
select pg_temp.as_user((select c1 from ids));
update profiles set headline = 'Kế toán 3 năm', skills = '{Excel}' where id = auth.uid();
insert into saved_postings (candidate_id, posting_id) values (auth.uid(), (select p_open from ids));
select pg_temp.ok((select count(*) from saved_postings) = 1, '16 Candidate lưu được tin');
reset role;
select pg_temp.as_user((select c2 from ids));
select pg_temp.ok((select count(*) from saved_postings) = 0, '16 Candidate khác không thấy tin đã lưu của C1');
reset role;
select pg_temp.as_user((select e1 from ids));
select pg_temp.fails($$insert into saved_postings (candidate_id, posting_id) values (auth.uid(), (select p_open from ids))$$, 'row-level security|permission', '16 Employer không lưu tin được');
select pg_temp.fails($$update profiles set headline = 'x' where id = auth.uid()$$, 'check|permission', '16 Employer không có headline ứng viên');
reset role;

-- 17: notifications via triggers
select pg_temp.as_user((select c1 from ids));
insert into storage.objects (bucket_id, name, owner) values ('resumes', (select c1 from ids)::text || '/v2.pdf', (select c1 from ids));
reset role;
-- claims still name C1, so the security definer RPC sees auth.uid() = C1.
create temp table app as select (submit_application((select p_open from ids), (select c1 from ids)::text || '/v2.pdf')).id;
grant select on app to anon, authenticated;
select pg_temp.as_user((select e1 from ids));
select pg_temp.ok((select count(*) from notifications where type = 'APPLICATION_RECEIVED') = 1, '17 Employer nhận thông báo đơn mới');
select pg_temp.ok((select title || ' ' || body from notifications limit 1) like '%Kế toán v2%', '17 nội dung thông báo có tên tin');
select change_application_status((select id from app), 'REVIEWING');
reset role;
select pg_temp.as_user((select c1 from ids));
select pg_temp.ok((select count(*) from notifications where type = 'APPLICATION_STATUS_CHANGED') = 1, '17 Candidate nhận thông báo đổi trạng thái');
select pg_temp.ok((select count(*) from notifications where type = 'APPLICATION_RECEIVED') = 0, '17 Candidate không thấy thông báo của Employer');
update notifications set read_at = now() where recipient_id = auth.uid();
select pg_temp.ok((select count(*) from notifications where read_at is null) = 0, '17 Candidate đánh dấu đã đọc');
select pg_temp.fails($$update notifications set title = 'hack' where recipient_id = auth.uid()$$, 'permission', '17 không sửa được nội dung thông báo');
select change_application_status((select id from app), 'WITHDRAWN');
reset role;
select pg_temp.as_user((select e1 from ids));
select pg_temp.ok((select count(*) from notifications where type = 'APPLICATION_WITHDRAWN') = 1, '17 Employer nhận thông báo rút đơn');
reset role;
select pg_temp.as_user((select e2 from ids));
select pg_temp.ok((select count(*) from notifications) = 0, '17 Employer B không thấy thông báo của A');
reset role;

-- 17: views + dashboard stats
select pg_temp.as_anon();
select record_posting_view((select p_open from ids));
reset role;
select pg_temp.as_user((select c2 from ids));
select record_posting_view((select p_open from ids));
reset role;
select pg_temp.as_user((select e1 from ids));
select record_posting_view((select p_open from ids));
select pg_temp.ok((select views from employer_posting_stats where id = (select p_open from ids)) = 2, '17 lượt xem: anon + Candidate tính, chủ tin không tính');
reset role;
select pg_temp.as_user((select e2 from ids));
select pg_temp.ok((select count(*) from employer_posting_stats where id = (select p_open from ids)) = 0, '17 Employer B không thấy thống kê tin của A');
reset role;
select pg_temp.as_anon();
select pg_temp.fails($$select count(*) from notifications$$, 'permission', '17 anon không đọc notifications');
reset role;

rollback;
