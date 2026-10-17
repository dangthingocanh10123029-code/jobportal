-- Ticket 16: Candidate profile (headline, skills, experience, education) + saved postings.
-- Mirrored by candidateProfileInputSchema in src/actions/candidates-schema.ts.

-- ≤ 20 skills, each 1–30 characters, no case-insensitive duplicates (valid_skills allows 10 for postings).
create function public.valid_profile_skills(skills text[]) returns boolean
  language sql immutable strict parallel safe
  set search_path = ''
as $$
  select cardinality(skills) <= 20
    and not exists (select 1 from unnest(skills) s where s is null or length(btrim(s)) not between 1 and 30)
    and (select count(distinct lower(btrim(s))) from unnest(skills) s) = cardinality(skills)
$$;

alter table public.profiles
  add column headline text check (headline is null or length(btrim(headline)) between 1 and 150),
  add column skills text[] not null default '{}' check (public.valid_profile_skills(skills)),
  add column experience text check (experience is null or length(experience) <= 5000),
  add column education text check (education is null or length(education) <= 5000),
  add constraint candidate_profile_fields check (
    role = 'CANDIDATE' or (headline is null and skills = '{}' and experience is null and education is null)
  );

-- Owner edits through profiles_update_own (own row only); Employers are held empty by the CHECK above.
grant update (headline, skills, experience, education) on public.profiles to authenticated;

-- Employer reads a Candidate's profile only through an Application on their own posting.
-- create or replace view only appends columns; the view keeps its owner rights and auth.uid() filter.
create or replace view public.employer_application_summaries as
  select a.id, a.job_posting_id, a.candidate_id, a.status, a.created_at, a.updated_at, a.resume_path,
         p.employer_id, c.full_name as candidate_name, c.phone as candidate_phone,
         c.headline as candidate_headline, c.skills as candidate_skills,
         c.experience as candidate_experience, c.education as candidate_education
  from public.applications a
  join public.job_postings p on p.id = a.job_posting_id
  join public.profiles c on c.id = a.candidate_id
  where p.employer_id = (select auth.uid());

create table public.saved_postings (
  candidate_id uuid not null references public.profiles (id) on delete cascade,
  posting_id uuid not null references public.job_postings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (candidate_id, posting_id)
);

alter table public.saved_postings enable row level security;

create policy saved_postings_select_own on public.saved_postings
  for select to authenticated
  using (candidate_id = (select auth.uid()));

-- Only Candidates, only for themselves, only PUBLISHED/CLOSED postings (DRAFT stays private).
create policy saved_postings_insert_own on public.saved_postings
  for insert to authenticated
  with check (
    candidate_id = (select auth.uid())
    and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'CANDIDATE')
    and exists (select 1 from public.job_postings where id = posting_id and status in ('PUBLISHED', 'CLOSED'))
  );

create policy saved_postings_delete_own on public.saved_postings
  for delete to authenticated
  using (candidate_id = (select auth.uid()));

revoke all on public.saved_postings from anon, authenticated;
grant select, delete on public.saved_postings to authenticated;
grant insert (candidate_id, posting_id) on public.saved_postings to authenticated;

-- Saved list: posting summary + status (isOpen is computed in the app, ADR-0001) + saved_at.
create view public.saved_posting_summaries with (security_invoker = true) as
  select s.candidate_id, s.created_at as saved_at,
         p.id, p.employer_id, p.title, p.company_name, p.company_logo_url, p.location, p.employment_type, p.salary_min, p.salary_max,
         p.application_deadline, p.created_at, p.industry, p.level, p.experience_years, p.skills, p.status
  from public.saved_postings s
  join public.job_postings_with_company p on p.id = s.posting_id;

grant select on public.saved_posting_summaries to authenticated;
