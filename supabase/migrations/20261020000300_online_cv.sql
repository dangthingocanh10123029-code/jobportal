-- Ticket 42: online CV (one per Candidate) and applying with it instead of a PDF.
-- The item structure inside the jsonb arrays is validated by CvInput (backend/app/modules/cv/schemas.py);
-- the table holds the sizes. An Application keeps a snapshot, so later edits never change a submitted one.

create table public.candidate_cvs (
  candidate_id uuid primary key references public.profiles (id) on delete cascade,
  template text not null check (template in ('CLASSIC', 'MODERN')),
  full_name text not null check (length(full_name) between 1 and 100),
  headline text check (length(headline) between 1 and 150),
  email text not null check (length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text check (phone ~ '^\+?[0-9 .-]{8,20}$'),
  location text check (length(location) between 1 and 150),
  summary text check (length(summary) between 1 and 2000),
  experiences jsonb not null default '[]' check (jsonb_typeof(experiences) = 'array' and jsonb_array_length(experiences) <= 15),
  educations jsonb not null default '[]' check (jsonb_typeof(educations) = 'array' and jsonb_array_length(educations) <= 15),
  certifications jsonb not null default '[]'
    check (jsonb_typeof(certifications) = 'array' and jsonb_array_length(certifications) <= 15),
  skills text[] not null default '{}' check (cardinality(skills) <= 30),
  languages text[] not null default '{}' check (cardinality(languages) <= 10),
  updated_at timestamptz not null default now()
);

create trigger candidate_cvs_set_updated_at
  before update on public.candidate_cvs
  for each row execute function public.set_updated_at();

-- Owner only, and only a Candidate may have one. Employers see a CV only as an Application's snapshot.
alter table public.candidate_cvs enable row level security;

create policy candidate_cvs_select_own on public.candidate_cvs
  for select to authenticated
  using (candidate_id = (select auth.uid()));

create policy candidate_cvs_insert_own on public.candidate_cvs
  for insert to authenticated
  with check (
    candidate_id = (select auth.uid())
    and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'CANDIDATE')
  );

create policy candidate_cvs_update_own on public.candidate_cvs
  for update to authenticated
  using (candidate_id = (select auth.uid()))
  with check (candidate_id = (select auth.uid()));

create policy candidate_cvs_delete_own on public.candidate_cvs
  for delete to authenticated
  using (candidate_id = (select auth.uid()));

revoke all on public.candidate_cvs from anon, authenticated;
grant select, insert, update, delete on public.candidate_cvs to authenticated;

-- Exactly one source per Application: the uploaded PDF or the CV snapshot taken at submit.
alter table public.applications
  alter column resume_path drop not null,
  add column cv_source text not null default 'FILE' check (cv_source in ('FILE', 'ONLINE')),
  add column online_cv jsonb,
  add constraint applications_one_cv_source check (
    (cv_source = 'FILE' and resume_path is not null and online_cv is null)
    or (cv_source = 'ONLINE' and resume_path is null and online_cv is not null)
  );

create or replace function public.applications_guard() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.job_posting_id <> old.job_posting_id or new.candidate_id <> old.candidate_id
     or new.resume_path is distinct from old.resume_path or new.cv_source <> old.cv_source
     or new.online_cv is distinct from old.online_cv then
    raise exception 'application % posting, candidate and CV are fixed', old.id using errcode = 'check_violation';
  end if;
  if new.status <> old.status
     and not public.application_transition_allowed(old.status, new.status, 'EMPLOYER')
     and not public.application_transition_allowed(old.status, new.status, 'CANDIDATE') then
    raise exception 'invalid application status transition % -> %', old.status, new.status using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

-- Same checks as before plus the ONLINE source: no file, and the caller's CV copied in the same transaction.
drop function public.submit_application(uuid, text);

create function public.submit_application(p_job_posting_id uuid, p_resume_path text, p_cv_source text default 'FILE')
returns public.applications
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_cv jsonb;
  v_application public.applications;
begin
  if not exists (select 1 from public.profiles where id = v_uid and role = 'CANDIDATE') then
    raise exception 'only a signed-in Candidate can apply' using errcode = 'insufficient_privilege';
  end if;
  if p_cv_source = 'ONLINE' then
    select to_jsonb(cv) into v_cv from public.candidate_cvs cv where cv.candidate_id = v_uid;
    if p_resume_path is not null or v_cv is null then
      raise exception 'CV_NOT_FOUND';
    end if;
  -- The Resume must already be uploaded into the Candidate's own folder of the resumes bucket.
  elsif p_cv_source is distinct from 'FILE'
     or p_resume_path is null
     or (storage.foldername(p_resume_path))[1] is distinct from v_uid::text
     or not exists (select 1 from storage.objects where bucket_id = 'resumes' and name = p_resume_path) then
    raise exception 'INVALID_RESUME';
  end if;
  if not exists (select 1 from public.open_job_postings where id = p_job_posting_id) then
    raise exception 'POSTING_NOT_OPEN';
  end if;

  begin
    insert into public.applications (job_posting_id, candidate_id, resume_path, cv_source, online_cv)
    values (p_job_posting_id, v_uid, p_resume_path, p_cv_source, v_cv)
    returning * into v_application;
  exception when unique_violation then
    raise exception 'ALREADY_APPLIED';
  end;

  insert into public.application_status_changes (application_id, from_status, to_status, changed_by, changed_by_role)
  values (v_application.id, null, 'SUBMITTED', v_uid, 'CANDIDATE');

  return v_application;
end;
$$;

revoke execute on function public.submit_application(uuid, text, text) from public, anon;
grant execute on function public.submit_application(uuid, text, text) to authenticated;

-- create or replace view only appends columns; both views keep their owner rights and auth.uid() filter.
create or replace view public.candidate_application_summaries with (security_invoker = false) as
  select a.id, a.job_posting_id, a.candidate_id, a.status, a.created_at, a.updated_at,
         p.title as posting_title, c.name as company_name, a.cv_source
  from public.applications a
  join public.job_postings p on p.id = a.job_posting_id
  join public.companies c on c.id = p.employer_id
  where a.candidate_id = (select auth.uid());

create or replace view public.employer_application_summaries as
  select a.id, a.job_posting_id, a.candidate_id, a.status, a.created_at, a.updated_at, a.resume_path,
         p.employer_id, c.full_name as candidate_name, c.phone as candidate_phone,
         c.headline as candidate_headline, c.skills as candidate_skills,
         c.experience as candidate_experience, c.education as candidate_education,
         a.cv_source, a.online_cv
  from public.applications a
  join public.job_postings p on p.id = a.job_posting_id
  join public.profiles c on c.id = a.candidate_id
  where p.employer_id = (select auth.uid());
