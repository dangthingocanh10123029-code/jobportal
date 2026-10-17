-- Ticket 18: remove every demo account (*@demo.jobportal.test) and everything it owns.
-- Run as postgres: psql "$DATABASE_URL" -f supabase/seed/wipe-demo.sql
-- auth.users → profiles → companies, job_postings → applications → status history, notifications,
-- saved_postings, posting_views all cascade (ticket 13). Storage rows do not, so they go first.
\set ON_ERROR_STOP 1
begin;
select set_config('storage.allow_delete_query', 'true', true);
delete from storage.objects
where bucket_id in ('resumes', 'company-logos')
  and (storage.foldername(name))[1] in (select id::text from auth.users where email like '%@demo.jobportal.test');
delete from auth.users where email like '%@demo.jobportal.test';
commit;
select count(*) as demo_users_left from auth.users where email like '%@demo.jobportal.test';
