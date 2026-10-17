-- Ticket 14: rich postings (industry, level, experience, headcount, skills, requirements, benefits),
-- new Search Filter fields and sorts. Mirrored by postingInputSchema in src/actions/postings-schema.ts.

-- ≤ 10 skills, each 1–30 characters, no case-insensitive duplicates.
create function public.valid_skills(skills text[]) returns boolean
  language sql immutable strict parallel safe
  set search_path = ''
as $$
  select cardinality(skills) <= 10
    and not exists (select 1 from unnest(skills) s where s is null or length(btrim(s)) not between 1 and 30)
    and (select count(distinct lower(btrim(s))) from unnest(skills) s) = cardinality(skills)
$$;

-- Folded skills for the skill filter (equality with one element), see foldAccents() in domain/search.ts.
create function public.f_unaccent_array(text[]) returns text[]
  language sql immutable strict parallel safe
  set search_path = ''
as $$ select array(select public.f_unaccent(s) from unnest($1) s) $$;

-- Defaults fill postings created before v2 (contract §14); the app always sends every field.
alter table public.job_postings
  add column industry text not null default 'OTHER' check (industry in (
    'IT_SOFTWARE', 'SALES', 'MARKETING', 'ACCOUNTING_FINANCE', 'HR', 'ADMIN', 'CUSTOMER_SERVICE', 'EDUCATION',
    'HEALTHCARE', 'CONSTRUCTION', 'MANUFACTURING', 'LOGISTICS', 'HOSPITALITY', 'DESIGN', 'LEGAL', 'OTHER')),
  add column level text not null default 'JUNIOR'
    check (level in ('INTERN', 'FRESHER', 'JUNIOR', 'MIDDLE', 'SENIOR', 'LEAD', 'MANAGER')),
  add column experience_years smallint not null default 0 check (experience_years between 0 and 20),
  add column headcount smallint not null default 1 check (headcount between 1 and 999),
  add column skills text[] not null default '{}' check (public.valid_skills(skills)),
  -- '' only on pre-v2 postings.
  add column requirements text not null default ''
    check (requirements = '' or length(btrim(requirements)) between 10 and 5000),
  add column benefits text not null default ''
    check (benefits = '' or length(btrim(benefits)) between 10 and 5000);

-- Column grants are additive; job_postings_guard already freezes CLOSED rows whatever column changes.
grant insert (industry, level, experience_years, headcount, skills, requirements, benefits)
  on public.job_postings to authenticated;
grant update (industry, level, experience_years, headcount, skills, requirements, benefits)
  on public.job_postings to authenticated;

-- create or replace view only appends columns, so the old ones keep their names and order.
-- company_logo_url is null until ticket 15 (companies) replaces it.
create or replace view public.job_postings_with_company with (security_invoker = true) as
  select p.id, p.employer_id, p.title, p.description, p.location, p.employment_type, p.salary_min, p.salary_max,
         p.application_deadline, p.status, p.created_at, p.updated_at, c.company_name,
         p.industry, p.level, p.experience_years, p.headcount, p.skills, p.requirements, p.benefits,
         null::text as company_logo_url
  from public.job_postings p
  join public.employer_companies c on c.employer_id = p.employer_id;

create or replace view public.open_job_postings with (security_invoker = true) as
  select id, employer_id, title, description, location, employment_type, salary_min, salary_max,
    application_deadline, status, created_at, updated_at, company_name,
    public.f_unaccent(title || ' ' || description) as search_text,
    public.f_unaccent(location) as search_location,
    industry, level, experience_years, headcount, skills, requirements, benefits, company_logo_url,
    public.f_unaccent_array(skills) as search_skills
  from public.job_postings_with_company
  where status = 'PUBLISHED' and application_deadline >= now();

-- Filters and sorts of the public list (newest already has job_postings_published_created_idx).
create index job_postings_published_industry_idx on public.job_postings (industry, created_at desc)
  where status = 'PUBLISHED';
create index job_postings_published_salary_idx on public.job_postings (salary_max desc nulls last, created_at desc)
  where status = 'PUBLISHED';
create index job_postings_published_deadline_idx on public.job_postings (application_deadline)
  where status = 'PUBLISHED';
-- ponytail: no index for the skill filter (a GIN on f_unaccent_array(skills) is not matched through the view);
-- it filters the already-small open set. Add a stored folded column + GIN if postings grow to tens of thousands.
