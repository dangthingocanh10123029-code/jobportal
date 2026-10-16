-- Ticket 03: public read side of job_postings.

-- CLOSED postings stay readable by everyone (old links say "no longer accepting Applications");
-- DRAFT stays private to its owner via job_postings_select_own.
drop policy job_postings_select_published on public.job_postings;
create policy job_postings_select_public on public.job_postings
  for select to anon, authenticated
  using (status in ('PUBLISHED', 'CLOSED'));

-- The one definition of "open" (ADR-0001): PUBLISHED and deadline not yet passed, against the DB clock.
-- Mirrored by isOpen() in src/modules/job-posting/domain/status.ts. Public lists and the
-- apply flow (ticket 05) must read from this view, never re-state the condition.
create view public.open_job_postings with (security_invoker = true) as
  select *
  from public.job_postings_with_company
  where status = 'PUBLISHED' and application_deadline >= now();

grant select on public.open_job_postings to anon, authenticated;
