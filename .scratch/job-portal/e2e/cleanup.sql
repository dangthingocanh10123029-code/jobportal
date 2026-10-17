-- Remove every E2E fixture: resumes, applications (cascade via candidate), postings (cascade via employer), users.
begin;
select set_config('storage.allow_delete_query', 'true', true);
delete from storage.objects where bucket_id = 'resumes' and name like 'e2e00000-0000-4000-8000-0000000000c1/%';
-- History rows reference profiles (changed_by, no ON DELETE): drop the fixtures' applications first (history cascades).
delete from public.applications where candidate_id = 'e2e00000-0000-4000-8000-0000000000c1'
   or job_posting_id in (select id from public.job_postings where employer_id = 'e2e00000-0000-4000-8000-0000000000e1');
delete from auth.users where email = 'e2e.candidate@jobportal.test';
delete from auth.users where email = 'e2e.employer@jobportal.test';
commit;
select 'left: users=' || (select count(*) from auth.users where email like 'e2e.%')
  || ' postings=' || (select count(*) from public.job_postings where employer_id = 'e2e00000-0000-4000-8000-0000000000e1')
  || ' resumes=' || (select count(*) from storage.objects where name like 'e2e00000-%');
