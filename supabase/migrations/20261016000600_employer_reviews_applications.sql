-- Ticket 07: Employer lists Applications on own postings, downloads Resumes, changes status
-- (status changes reuse public.change_application_status from ticket 06).

-- Employer's list: Application + Candidate name and phone. profiles RLS only shows a user their own row,
-- so this view runs with its owner's rights (no security_invoker) and filters to the caller's postings itself.
-- It exposes only name and phone of Candidates who applied to the caller's postings.
create view public.employer_application_summaries as
  select a.id, a.job_posting_id, a.candidate_id, a.status, a.created_at, a.updated_at, a.resume_path,
         p.employer_id, c.full_name as candidate_name, c.phone as candidate_phone
  from public.applications a
  join public.job_postings p on p.id = a.job_posting_id
  join public.profiles c on c.id = a.candidate_id
  where p.employer_id = (select auth.uid());

revoke all on public.employer_application_summaries from anon, authenticated;
grant select on public.employer_application_summaries to authenticated;

create index applications_posting_created_idx on public.applications (job_posting_id, created_at desc);

-- Employer may read (and so sign a URL for) a Resume attached to an Application on their own posting.
-- The subquery runs under applications RLS, which already limits the Employer to their postings.
create policy resumes_select_employer on storage.objects
  for select to authenticated
  using (
    bucket_id = 'resumes'
    and exists (
      select 1 from public.applications a
      join public.job_postings p on p.id = a.job_posting_id
      where a.resume_path = name and p.employer_id = (select auth.uid())
    )
  );
