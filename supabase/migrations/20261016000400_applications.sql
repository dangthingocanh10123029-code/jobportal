-- Ticket 05: applications + append-only Status Change history, atomic submit RPC, private resumes bucket.

-- Mirrors allowedNextStatuses() in src/modules/application/domain/status.ts:
-- Employer makes every transition except WITHDRAWN; Candidate only WITHDRAWN.
create function public.application_transition_allowed(from_status text, to_status text, by_role text) returns boolean
  language sql immutable parallel safe
  set search_path = ''
as $$
  select (to_status = 'WITHDRAWN') = (by_role = 'CANDIDATE')
    and case from_status
      when 'SUBMITTED' then to_status in ('REVIEWING', 'REJECTED', 'WITHDRAWN')
      when 'REVIEWING' then to_status in ('INTERVIEWING', 'REJECTED', 'WITHDRAWN')
      when 'INTERVIEWING' then to_status in ('OFFERED', 'REJECTED', 'WITHDRAWN')
      when 'OFFERED' then to_status in ('HIRED', 'REJECTED', 'WITHDRAWN')
      else false
    end
$$;

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  job_posting_id uuid not null references public.job_postings (id),
  candidate_id uuid not null references public.profiles (id) on delete cascade,
  resume_path text not null,
  status text not null default 'SUBMITTED'
    check (status in ('SUBMITTED', 'REVIEWING', 'INTERVIEWING', 'OFFERED', 'HIRED', 'REJECTED', 'WITHDRAWN')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- ADR-0002: one Application per Candidate per posting, even after REJECTED/WITHDRAWN.
  constraint applications_one_per_posting unique (job_posting_id, candidate_id)
);

create index applications_candidate_created_idx on public.applications (candidate_id, created_at desc);

create table public.application_status_changes (
  id bigint generated always as identity primary key,
  application_id uuid not null references public.applications (id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid not null references public.profiles (id),
  changed_by_role text not null check (changed_by_role in ('CANDIDATE', 'EMPLOYER')),
  changed_at timestamptz not null default now(),
  -- The first entry is the Candidate's submit; every later one must be a legal transition for its actor.
  constraint valid_status_change check (
    (from_status is null and to_status = 'SUBMITTED' and changed_by_role = 'CANDIDATE')
    or public.application_transition_allowed(from_status, to_status, changed_by_role)
  )
);

create index application_status_changes_application_idx on public.application_status_changes (application_id, changed_at);

create trigger applications_set_updated_at
  before update on public.applications
  for each row execute function public.set_updated_at();

-- Status, owner and posting never change outside the state machine, even from the SQL editor.
create function public.applications_guard() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.job_posting_id <> old.job_posting_id or new.candidate_id <> old.candidate_id or new.resume_path <> old.resume_path then
    raise exception 'application % posting, candidate and resume are fixed', old.id using errcode = 'check_violation';
  end if;
  if new.status <> old.status
     and not public.application_transition_allowed(old.status, new.status, 'EMPLOYER')
     and not public.application_transition_allowed(old.status, new.status, 'CANDIDATE') then
    raise exception 'invalid application status transition % -> %', old.status, new.status using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger applications_guard
  before update on public.applications
  for each row execute function public.applications_guard();

-- RLS: Candidate reads own; Employer reads those on own postings. Writes only through the RPCs below.
alter table public.applications enable row level security;
alter table public.application_status_changes enable row level security;

create policy applications_select_candidate on public.applications
  for select to authenticated
  using (candidate_id = (select auth.uid()));

create policy applications_select_employer on public.applications
  for select to authenticated
  using (exists (
    select 1 from public.job_postings p
    where p.id = job_posting_id and p.employer_id = (select auth.uid())
  ));

-- History is visible exactly when its Application is (the subquery runs under applications RLS).
create policy application_status_changes_select on public.application_status_changes
  for select to authenticated
  using (exists (select 1 from public.applications a where a.id = application_id));

revoke all on public.applications, public.application_status_changes from anon, authenticated;
grant select on public.applications, public.application_status_changes to authenticated;

-- Atomic submit: posting openness on the DB clock (open_job_postings, ADR-0001), the UNIQUE constraint
-- against double submits (ADR-0002), and the Application + its first Status Change in one transaction.
-- Errors carry the ApplicationErrorCode as message (src/modules/application/domain/errors.ts).
create function public.submit_application(p_job_posting_id uuid, p_resume_path text) returns public.applications
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_application public.applications;
begin
  if not exists (select 1 from public.profiles where id = v_uid and role = 'CANDIDATE') then
    raise exception 'only a signed-in Candidate can apply' using errcode = 'insufficient_privilege';
  end if;
  -- The Resume must already be uploaded into the Candidate's own folder of the resumes bucket.
  if p_resume_path is null
     or (storage.foldername(p_resume_path))[1] is distinct from v_uid::text
     or not exists (select 1 from storage.objects where bucket_id = 'resumes' and name = p_resume_path) then
    raise exception 'INVALID_RESUME';
  end if;
  if not exists (select 1 from public.open_job_postings where id = p_job_posting_id) then
    raise exception 'POSTING_NOT_OPEN';
  end if;

  begin
    insert into public.applications (job_posting_id, candidate_id, resume_path)
    values (p_job_posting_id, v_uid, p_resume_path)
    returning * into v_application;
  exception when unique_violation then
    raise exception 'ALREADY_APPLIED';
  end;

  insert into public.application_status_changes (application_id, from_status, to_status, changed_by, changed_by_role)
  values (v_application.id, null, 'SUBMITTED', v_uid, 'CANDIDATE');

  return v_application;
end;
$$;

revoke execute on function public.submit_application(uuid, text) from public, anon;
grant execute on function public.submit_application(uuid, text) to authenticated;

-- Private bucket; Storage itself refuses anything but a PDF up to 5 MB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('resumes', 'resumes', false, 5242880, array['application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Candidate uploads only into the folder named by their user id.
create policy resumes_insert_own_folder on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'CANDIDATE')
  );

create policy resumes_select_own_folder on storage.objects
  for select to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Lets the app clean up an upload whose submit failed; a Resume attached to an Application stays.
create policy resumes_delete_unused on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and not exists (select 1 from public.applications a where a.resume_path = name)
  );

-- No update policy: an uploaded Resume is never replaced (spec, Out of Scope).
-- Employer download (ticket 07) goes through a server-side signed URL after an ownership check.
