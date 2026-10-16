-- Ticket 02: job_postings + RLS. EXPIRED is derived, never stored (ADR-0001).

create table public.job_postings (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title text not null check (length(btrim(title)) between 5 and 150),
  description text not null check (length(btrim(description)) >= 20),
  location text not null check (length(btrim(location)) between 1 and 100),
  employment_type text not null check (employment_type in ('FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'CONTRACT')),
  salary_min bigint check (salary_min >= 0),
  salary_max bigint check (salary_max >= 0),
  application_deadline timestamptz not null,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'PUBLISHED', 'CLOSED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint salary_range check (salary_min is null or salary_max is null or salary_min <= salary_max)
);

create index job_postings_employer_created_idx on public.job_postings (employer_id, created_at desc);
create index job_postings_published_created_idx on public.job_postings (created_at desc) where status = 'PUBLISHED';

alter table public.job_postings enable row level security;

-- Everyone (incl. anonymous) reads PUBLISHED; open/expired filtering is done by the queries (ticket 03).
create policy job_postings_select_published on public.job_postings
  for select to anon, authenticated
  using (status = 'PUBLISHED');

-- Owner reads own rows of any status, so DRAFT stays private to its Employer.
create policy job_postings_select_own on public.job_postings
  for select to authenticated
  using (employer_id = (select auth.uid()));

-- Only Employers create, always as DRAFT, always for themselves.
create policy job_postings_insert_own on public.job_postings
  for insert to authenticated
  with check (
    employer_id = (select auth.uid())
    and status = 'DRAFT'
    and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'EMPLOYER')
  );

create policy job_postings_update_own on public.job_postings
  for update to authenticated
  using (employer_id = (select auth.uid()))
  with check (employer_id = (select auth.uid()));

-- No delete policy. employer_id/created_at are not updatable (column grants).
revoke all on public.job_postings from anon, authenticated;
grant select on public.job_postings to anon, authenticated;
grant insert (employer_id, title, description, location, employment_type, salary_min, salary_max, application_deadline)
  on public.job_postings to authenticated;
grant update (title, description, location, employment_type, salary_min, salary_max, application_deadline, status)
  on public.job_postings to authenticated;

create trigger job_postings_set_updated_at
  before update on public.job_postings
  for each row execute function public.set_updated_at();

-- Mirrors the domain state machine (src/modules/job-posting/domain/status.ts) so it holds outside the app.
create function public.job_postings_guard() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'CLOSED' then
    raise exception 'job posting % is CLOSED and cannot be changed', old.id using errcode = 'check_violation';
  end if;
  if new.status is distinct from old.status
     and not (old.status = 'DRAFT' and new.status = 'PUBLISHED')
     and not (old.status = 'PUBLISHED' and new.status = 'CLOSED') then
    raise exception 'invalid status transition % -> %', old.status, new.status using errcode = 'check_violation';
  end if;
  if old.status = 'DRAFT' and new.status = 'PUBLISHED' and new.application_deadline <= now() then
    raise exception 'application_deadline must be in the future to publish' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger job_postings_guard
  before update on public.job_postings
  for each row execute function public.job_postings_guard();

-- Postings with the public company name. security_invoker keeps job_postings RLS;
-- employer_companies (owner privileges) exposes only company_name.
create view public.job_postings_with_company with (security_invoker = true) as
  select p.*, c.company_name
  from public.job_postings p
  join public.employer_companies c on c.employer_id = p.employer_id;

grant select on public.job_postings_with_company to anon, authenticated;
