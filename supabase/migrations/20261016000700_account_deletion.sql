-- Ticket 13: deleting an auth user (Supabase dashboard) must not be blocked by history or postings.
-- Employer → job_postings → applications → application_status_changes cascade; a Status Change outlives its
-- actor with changed_by = null (changed_by_role stays, so valid_status_change still holds).

alter table public.application_status_changes
  alter column changed_by drop not null,
  drop constraint application_status_changes_changed_by_fkey,
  add constraint application_status_changes_changed_by_fkey
    foreign key (changed_by) references public.profiles (id) on delete set null;

alter table public.applications
  drop constraint applications_job_posting_id_fkey,
  add constraint applications_job_posting_id_fkey
    foreign key (job_posting_id) references public.job_postings (id) on delete cascade;
