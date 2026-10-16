-- Ticket 01: profiles (1 account = 1 role) + RLS.
-- The row is created by a trigger on auth.users from sign-up metadata, so sign-up is atomic.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('CANDIDATE', 'EMPLOYER')),
  full_name text check (full_name is null or length(btrim(full_name)) between 1 and 100),
  phone text check (phone is null or phone ~ '^\+?[0-9 .-]{8,20}$'),
  company_name text check (company_name is null or length(btrim(company_name)) between 1 and 150),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint candidate_has_full_name check (role <> 'CANDIDATE' or full_name is not null),
  constraint employer_has_company_name check (role <> 'EMPLOYER' or company_name is not null)
);

alter table public.profiles enable row level security;

-- Owner reads own row.
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

-- Owner updates own row; role is not updatable (column grant below).
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- No insert/delete policy: rows come only from the trigger and go with auth.users.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, phone, company_name) on public.profiles to authenticated;

create function public.set_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create function public.handle_new_user() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Invalid/missing role or required name fails the CHECKs and aborts the sign-up.
  insert into public.profiles (id, role, full_name, company_name)
  values (
    new.id,
    new.raw_user_meta_data ->> 'role',
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'company_name'), '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Spec: company_name is public for posting display. A view (owner privileges) exposes only that column.
create view public.employer_companies as
  select id as employer_id, company_name
  from public.profiles
  where role = 'EMPLOYER';

grant select on public.employer_companies to anon, authenticated;
