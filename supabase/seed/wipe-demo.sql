-- Ticket 18: remove every demo account (*@demo.jobportal.test) and everything it owns.
-- Run as postgres: psql "$DATABASE_URL" -f supabase/seed/wipe-demo.sql
-- auth.users → profiles → companies, job_postings → applications → status history, notifications,
-- saved_postings, posting_views all cascade (ticket 13).
-- Storage is left alone: deleting storage.objects rows in SQL orphans the files behind them. The demo CVs
-- (resumes/<candidate_id>/demo-cv.pdf) are meant to survive, since the next seed recreates the same ids.
\set ON_ERROR_STOP 1
begin;
create temp table demo_user on commit drop as
select id from auth.users where email like '%@demo.jobportal.test';

-- Real users' notifications that link to an Application or posting about to go (trigger link formats, ticket 17).
delete from public.notifications n
using public.applications a
where n.link = '/candidate/applications/' || a.id
  and (a.candidate_id in (select id from demo_user)
       or a.job_posting_id in (select id from public.job_postings where employer_id in (select id from demo_user)));
delete from public.notifications n
using public.job_postings p
where n.link = '/employer/postings/' || p.id || '/applications'
  and p.employer_id in (select id from demo_user);

delete from auth.users where id in (select id from demo_user);
commit;
select count(*) as demo_users_left from auth.users where email like '%@demo.jobportal.test';
