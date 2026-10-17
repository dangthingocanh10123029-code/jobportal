-- Ticket 15: company pages. One Company per Employer (id = the Employer's profile id), public read, owner edits.
-- Mirrored by companyInputSchema in src/actions/companies-schema.ts.

create table public.companies (
  id uuid primary key references public.profiles (id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 150),
  -- Public URL of an object in the Employer's own folder of the company-logos bucket.
  -- ponytail: the host is not pinned (the project URL is unknown to SQL); a crafted API call can point at another
  -- host's path of the same shape. Move to a stored object path + URL built in the app if that matters.
  logo_url text check (
    logo_url is null
    or logo_url ~ ('^https?://[^/]+/storage/v1/object/public/company-logos/' || id::text || '/[^/]+$')
  ),
  about text check (about is null or length(about) <= 5000),
  size text check (size is null or size in ('S1_10', 'S11_50', 'S51_200', 'S201_500', 'S500_PLUS')),
  address text check (address is null or length(address) <= 300),
  website text check (website is null or (website ~* '^https?://[^\s/]+' and length(website) <= 300)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.companies enable row level security;

create policy companies_select_all on public.companies
  for select to anon, authenticated
  using (true);

create policy companies_update_own on public.companies
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- No insert/delete policy: rows come from the profile trigger below and go with the profile.
revoke all on public.companies from anon, authenticated;
grant select on public.companies to anon, authenticated;
grant update (name, logo_url, about, size, address, website) on public.companies to authenticated;

create trigger companies_set_updated_at
  before update on public.companies
  for each row execute function public.set_updated_at();

-- Existing Employers.
insert into public.companies (id, name)
select id, company_name from public.profiles where role = 'EMPLOYER'
on conflict (id) do nothing;

-- New Employer → their Company, in the same transaction as sign-up.
create function public.handle_new_employer() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.companies (id, name) values (new.id, new.company_name);
  return new;
end;
$$;

create trigger on_employer_profile_created
  after insert on public.profiles
  for each row when (new.role = 'EMPLOYER')
  execute function public.handle_new_employer();

-- profiles.company_name ↔ companies.name (contract §15). Each side only writes when the value differs,
-- so the echo of one update is a no-op and the two triggers do not loop.
create function public.sync_company_name_from_profile() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.companies set name = new.company_name
  where id = new.id and name is distinct from new.company_name;
  return new;
end;
$$;

create trigger profiles_sync_company_name
  after update of company_name on public.profiles
  for each row when (new.role = 'EMPLOYER' and new.company_name is distinct from old.company_name)
  execute function public.sync_company_name_from_profile();

create function public.sync_profile_company_name() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set company_name = new.name
  where id = new.id and company_name is distinct from new.name;
  return new;
end;
$$;

create trigger companies_sync_profile_company_name
  after update of name on public.companies
  for each row when (new.name is distinct from old.name)
  execute function public.sync_profile_company_name();

-- Security advisor: security definer trigger functions must not be callable via /rest/v1/rpc.
revoke execute on function public.handle_new_employer() from public, anon, authenticated;
revoke execute on function public.sync_company_name_from_profile() from public, anon, authenticated;
revoke execute on function public.sync_profile_company_name() from public, anon, authenticated;

-- Posting views take name + logo from companies. create or replace only appends columns.
create or replace view public.employer_companies as
  select id as employer_id, name as company_name, logo_url as company_logo_url
  from public.companies;

create or replace view public.job_postings_with_company with (security_invoker = true) as
  select p.id, p.employer_id, p.title, p.description, p.location, p.employment_type, p.salary_min, p.salary_max,
         p.application_deadline, p.status, p.created_at, p.updated_at, c.company_name,
         p.industry, p.level, p.experience_years, p.headcount, p.skills, p.requirements, p.benefits,
         c.company_logo_url
  from public.job_postings p
  join public.employer_companies c on c.employer_id = p.employer_id;

-- Company list: open posting count + folded name for the accent-insensitive search (see foldAccents()).
create view public.company_summaries with (security_invoker = true) as
  select c.id, c.name, c.logo_url, c.about, c.size, c.address, c.website,
    (select count(*) from public.open_job_postings o where o.employer_id = c.id)::int as open_postings,
    public.f_unaccent(c.name) as search_name
  from public.companies c;

grant select on public.company_summaries to anon, authenticated;

-- Public bucket; Storage itself refuses anything but PNG/JPEG/WebP up to 1 MB (no SVG: it can carry script).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('company-logos', 'company-logos', true, 1048576, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Employer writes only into the folder named by their user id. Select is needed by remove() and upsert.
create policy company_logos_select_own_folder on storage.objects
  for select to authenticated
  using (bucket_id = 'company-logos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy company_logos_insert_own_folder on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'company-logos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'EMPLOYER')
  );

create policy company_logos_update_own_folder on storage.objects
  for update to authenticated
  using (bucket_id = 'company-logos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (
    bucket_id = 'company-logos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'EMPLOYER')
  );

create policy company_logos_delete_own_folder on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'company-logos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'EMPLOYER')
  );
