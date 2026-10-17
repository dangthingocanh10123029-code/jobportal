-- Ticket 32: Admin (spec 41–48, contract §32). ADMIN is granted only by supabase/seed/make-admin.sql;
-- every admin write goes through a security definer RPC below that checks is_admin() and writes the audit
-- entry in the same transaction. The new moderation columns get no column grant, so no user can set them.

-- Roles. Sign-up metadata may only ask for CANDIDATE or EMPLOYER (spec 48).
alter table public.profiles
  drop constraint profiles_role_check,
  add constraint profiles_role_check check (role in ('CANDIDATE', 'EMPLOYER', 'ADMIN')),
  add column locked_at timestamptz,
  add column locked_reason text check (locked_reason is null or length(btrim(locked_reason)) between 5 and 500),
  add constraint profiles_locked_has_reason check ((locked_at is null) = (locked_reason is null));

create or replace function public.handle_new_user() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (new.raw_user_meta_data ->> 'role') is distinct from 'CANDIDATE'
     and (new.raw_user_meta_data ->> 'role') is distinct from 'EMPLOYER' then
    raise exception 'sign-up role must be CANDIDATE or EMPLOYER' using errcode = 'check_violation';
  end if;
  -- Missing required name fails the CHECKs and aborts the sign-up.
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

revoke execute on function public.handle_new_user() from public, anon, authenticated;

alter table public.job_postings
  add column hidden_at timestamptz,
  add column hidden_reason text check (hidden_reason is null or length(btrim(hidden_reason)) between 5 and 500),
  add column hidden_by uuid references public.profiles (id) on delete set null,
  add constraint job_postings_hidden_has_reason check ((hidden_at is null) = (hidden_reason is null));

alter table public.companies add column verified_at timestamptz;

-- Moderation (hidden_*) may change on any posting, CLOSED included; everything else keeps the state machine.
create or replace function public.job_postings_guard() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if to_jsonb(new) - '{hidden_at,hidden_reason,hidden_by,updated_at}'::text[]
     = to_jsonb(old) - '{hidden_at,hidden_reason,hidden_by,updated_at}'::text[] then
    return new;
  end if;
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

-- Security definer so policies can call it without RLS recursion on profiles.
create function public.is_admin() returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'ADMIN' and locked_at is null)
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create policy profiles_select_admin on public.profiles
  for select to authenticated
  using (public.is_admin());

create policy job_postings_select_admin on public.job_postings
  for select to authenticated
  using (public.is_admin());

-- A hidden posting leaves the public read; its Employer (job_postings_select_own) and ADMIN still see it.
drop policy job_postings_select_public on public.job_postings;
create policy job_postings_select_public on public.job_postings
  for select to anon, authenticated
  using (status in ('PUBLISHED', 'CLOSED') and hidden_at is null);

-- Posting views: create or replace only appends columns.
create or replace view public.employer_companies as
  select id as employer_id, name as company_name, logo_url as company_logo_url, verified_at is not null as company_verified
  from public.companies;

create or replace view public.job_postings_with_company with (security_invoker = true) as
  select p.id, p.employer_id, p.title, p.description, p.location, p.employment_type, p.salary_min, p.salary_max,
         p.application_deadline, p.status, p.created_at, p.updated_at, c.company_name,
         p.industry, p.level, p.experience_years, p.headcount, p.skills, p.requirements, p.benefits,
         c.company_logo_url, c.company_verified, p.hidden_at, p.hidden_reason
  from public.job_postings p
  join public.employer_companies c on c.employer_id = p.employer_id;

-- Hidden is never open, for anyone: submit_application (security definer, no RLS) reads this view.
create or replace view public.open_job_postings with (security_invoker = true) as
  select id, employer_id, title, description, location, employment_type, salary_min, salary_max,
    application_deadline, status, created_at, updated_at, company_name,
    public.f_unaccent(title || ' ' || description) as search_text,
    public.f_unaccent(location) as search_location,
    industry, level, experience_years, headcount, skills, requirements, benefits, company_logo_url,
    public.f_unaccent_array(skills) as search_skills,
    company_verified, hidden_at, hidden_reason
  from public.job_postings_with_company
  where status = 'PUBLISHED' and application_deadline >= now() and hidden_at is null;

create or replace view public.company_summaries with (security_invoker = true) as
  select c.id, c.name, c.logo_url, c.about, c.size, c.address, c.website,
    (select count(*) from public.open_job_postings o where o.employer_id = c.id)::int as open_postings,
    public.f_unaccent(c.name) as search_name,
    c.verified_at
  from public.companies c;

create or replace view public.saved_posting_summaries with (security_invoker = true) as
  select s.candidate_id, s.created_at as saved_at,
         p.id, p.employer_id, p.title, p.company_name, p.company_logo_url, p.location, p.employment_type, p.salary_min, p.salary_max,
         p.application_deadline, p.created_at, p.industry, p.level, p.experience_years, p.skills, p.status,
         p.company_verified
  from public.saved_postings s
  join public.job_postings_with_company p on p.id = s.posting_id;

-- "Old Applications stay" (contract §32): the Candidate's list must not lose an Application whose posting is
-- now hidden, so this view runs with its owner's rights and filters to the caller itself (like
-- employer_application_summaries). Columns are unchanged. Base tables only: a security_invoker view inside
-- would still apply the caller's RLS.
create or replace view public.candidate_application_summaries with (security_invoker = false) as
  select a.id, a.job_posting_id, a.candidate_id, a.status, a.created_at, a.updated_at,
         p.title as posting_title, c.name as company_name
  from public.applications a
  join public.job_postings p on p.id = a.job_posting_id
  join public.companies c on c.id = p.employer_id
  where a.candidate_id = (select auth.uid());

-- A hidden posting gets no new views (its page is 404 for outsiders).
create or replace function public.record_posting_view(p_posting_id uuid) returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.posting_views as v (posting_id, view_count)
  select p.id, 1
  from public.job_postings p
  where p.id = p_posting_id
    and p.status in ('PUBLISHED', 'CLOSED')
    and p.hidden_at is null
    and p.employer_id is distinct from auth.uid()
  on conflict (posting_id) do update set view_count = v.view_count + 1;
$$;

alter table public.notifications
  drop constraint notifications_type_check,
  add constraint notifications_type_check check (type in (
    'APPLICATION_RECEIVED', 'APPLICATION_STATUS_CHANGED', 'APPLICATION_WITHDRAWN', 'POSTING_HIDDEN'));

-- Append-only audit (spec 47). The actor's email is copied in, so an entry outlives its actor's account.
create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null,
  actor_email text not null,
  action text not null check (action in (
    'USER_LOCKED', 'USER_UNLOCKED', 'POSTING_HIDDEN', 'POSTING_UNHIDDEN', 'COMPANY_VERIFIED', 'COMPANY_UNVERIFIED')),
  target_type text not null check (target_type in ('USER', 'POSTING', 'COMPANY')),
  target_id uuid not null,
  target_label text not null,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index admin_audit_log_created_idx on public.admin_audit_log (created_at desc);

alter table public.admin_audit_log enable row level security;

create policy admin_audit_log_select_admin on public.admin_audit_log
  for select to authenticated
  using (public.is_admin());

revoke all on public.admin_audit_log from anon, authenticated;
grant select on public.admin_audit_log to authenticated;

-- Not even the SQL editor rewrites history.
create function public.admin_audit_log_append_only() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'admin_audit_log is append-only' using errcode = 'insufficient_privilege';
end;
$$;

create trigger admin_audit_log_append_only
  before update or delete on public.admin_audit_log
  for each row execute function public.admin_audit_log_append_only();

create function public.admin_audit(p_action text, p_target_type text, p_target_id uuid, p_label text, p_details jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.admin_audit_log (actor_id, actor_email, action, target_type, target_id, target_label, details)
  select auth.uid(), u.email, p_action, p_target_type, p_target_id, p_label, p_details
  from auth.users u where u.id = auth.uid();
$$;

revoke execute on function public.admin_audit(text, text, uuid, text, jsonb) from public, anon, authenticated;

-- Errors carry the AdminError code as message (backend/app/modules/admin/domain.py).
create function public.admin_require() returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'NOT_ADMIN' using errcode = 'insufficient_privilege';
  end if;
end;
$$;

revoke execute on function public.admin_require() from public, anon, authenticated;

create function public.admin_reason(p_reason text) returns text
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_reason is null or length(btrim(p_reason)) not between 5 and 500 then
    raise exception 'INVALID_REASON';
  end if;
  return btrim(p_reason);
end;
$$;

-- Lock: profile flag (FastAPI refuses the account) + GoTrue ban (no sign-in, no token refresh) + sessions gone.
-- ponytail: banned_until is a far date, not 'infinity' (GoTrue scans it into a Go time.Time).
create function public.admin_set_user_lock(p_user_id uuid, p_locked boolean, p_reason text default null) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
  v_email text;
  v_reason text;
begin
  perform public.admin_require();
  select p.role, u.email into v_role, v_email
  from public.profiles p join auth.users u on u.id = p.id
  where p.id = p_user_id
  for update of p;
  if not found then
    raise exception 'USER_NOT_FOUND';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'CANNOT_LOCK_SELF';
  end if;
  if v_role = 'ADMIN' then
    raise exception 'CANNOT_LOCK_ADMIN';
  end if;

  if p_locked then
    v_reason := public.admin_reason(p_reason);
    update public.profiles set locked_at = now(), locked_reason = v_reason where id = p_user_id;
    update auth.users set banned_until = now() + interval '100 years' where id = p_user_id;
    delete from auth.sessions where user_id = p_user_id;
    perform public.admin_audit('USER_LOCKED', 'USER', p_user_id, v_email, jsonb_build_object('reason', v_reason));
  else
    update public.profiles set locked_at = null, locked_reason = null where id = p_user_id;
    update auth.users set banned_until = null where id = p_user_id;
    perform public.admin_audit('USER_UNLOCKED', 'USER', p_user_id, v_email, '{}');
  end if;
end;
$$;

create function public.admin_set_posting_hidden(p_posting_id uuid, p_hidden boolean, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_posting public.job_postings;
  v_reason text;
begin
  perform public.admin_require();
  select * into v_posting from public.job_postings where id = p_posting_id for update;
  if not found then
    raise exception 'POSTING_NOT_FOUND';
  end if;

  if p_hidden then
    v_reason := public.admin_reason(p_reason);
    update public.job_postings set hidden_at = now(), hidden_reason = v_reason, hidden_by = auth.uid()
    where id = p_posting_id;
    insert into public.notifications (recipient_id, type, title, body, link)
    values (v_posting.employer_id, 'POSTING_HIDDEN', 'Tin tuyển dụng bị ẩn',
            format('Tin "%s" đã bị quản trị viên ẩn. Lý do: %s', v_posting.title, v_reason), '/employer/postings');
    perform public.admin_audit('POSTING_HIDDEN', 'POSTING', p_posting_id, v_posting.title,
                               jsonb_build_object('reason', v_reason));
  else
    update public.job_postings set hidden_at = null, hidden_reason = null, hidden_by = null where id = p_posting_id;
    perform public.admin_audit('POSTING_UNHIDDEN', 'POSTING', p_posting_id, v_posting.title, '{}');
  end if;
end;
$$;

create function public.admin_set_company_verified(p_company_id uuid, p_verified boolean) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  perform public.admin_require();
  update public.companies set verified_at = case when p_verified then coalesce(verified_at, now()) end
  where id = p_company_id
  returning name into v_name;
  if not found then
    raise exception 'COMPANY_NOT_FOUND';
  end if;
  perform public.admin_audit(case when p_verified then 'COMPANY_VERIFIED' else 'COMPANY_UNVERIFIED' end,
                             'COMPANY', p_company_id, v_name, '{}');
end;
$$;

revoke execute on function public.admin_set_user_lock(uuid, boolean, text) from public, anon;
revoke execute on function public.admin_set_posting_hidden(uuid, boolean, text) from public, anon;
revoke execute on function public.admin_set_company_verified(uuid, boolean) from public, anon;
grant execute on function public.admin_set_user_lock(uuid, boolean, text) to authenticated;
grant execute on function public.admin_set_posting_hidden(uuid, boolean, text) to authenticated;
grant execute on function public.admin_set_company_verified(uuid, boolean) to authenticated;

-- Admin lists: owner-rights views (auth.users is not readable by authenticated) that return nothing
-- unless the caller is ADMIN (security_barrier: filters never run before that check). FastAPI filters and pages them.
create view public.admin_users with (security_barrier = true) as
  select p.id as user_id, u.email::text as email, p.role,
         coalesce(p.full_name, p.company_name, '') as display_name,
         p.created_at, u.last_sign_in_at, p.locked_at, p.locked_reason, p.phone,
         (select count(*) from public.job_postings j where j.employer_id = p.id)::int as postings,
         (select count(*) from public.applications a where a.candidate_id = p.id)::int as applications,
         public.f_unaccent(u.email || ' ' || coalesce(p.full_name, p.company_name, '')) as search_text
  from public.profiles p
  join auth.users u on u.id = p.id
  where public.is_admin();

create view public.admin_postings with (security_barrier = true) as
  select p.id, p.employer_id, p.title, c.name as company_name, c.logo_url as company_logo_url,
         c.verified_at is not null as company_verified,
         p.location, p.employment_type, p.salary_min, p.salary_max, p.application_deadline, p.created_at,
         p.industry, p.level, p.experience_years, p.skills, p.status,
         case when p.status = 'PUBLISHED' and p.application_deadline < now() then 'EXPIRED' else p.status end
           as display_status,
         (select count(*) from public.applications a where a.job_posting_id = p.id)::int as applications,
         p.hidden_at, p.hidden_reason,
         public.f_unaccent(p.title || ' ' || c.name) as search_text
  from public.job_postings p
  join public.companies c on c.id = p.employer_id
  where public.is_admin();

create view public.admin_companies with (security_barrier = true) as
  select c.id, c.name, c.logo_url, c.about, c.size, c.address, c.website, c.verified_at,
         c.verified_at is not null as company_verified,
         (select count(*) from public.open_job_postings o where o.employer_id = c.id)::int as open_postings,
         u.email::text as employer_email,
         public.f_unaccent(c.name) as search_name
  from public.companies c
  join auth.users u on u.id = c.id
  where public.is_admin();

create view public.admin_audit_entries with (security_barrier = true) as
  select id, actor_id, actor_email, action, target_type, target_id, target_label, details, created_at
  from public.admin_audit_log
  where public.is_admin();

revoke all on public.admin_users, public.admin_postings, public.admin_companies, public.admin_audit_entries
  from anon, authenticated;
grant select on public.admin_users, public.admin_postings, public.admin_companies, public.admin_audit_entries
  to authenticated;

-- Overview (contract AdminStats) in one call; days are Asia/Ho_Chi_Minh calendar days, all 30 present.
create function public.admin_stats() returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
begin
  perform public.admin_require();
  return jsonb_build_object(
    'users', (
      select jsonb_build_object(
        'CANDIDATE', count(*) filter (where role = 'CANDIDATE'),
        'EMPLOYER', count(*) filter (where role = 'EMPLOYER'),
        'ADMIN', count(*) filter (where role = 'ADMIN'),
        'locked', count(*) filter (where locked_at is not null))
      from public.profiles),
    'postings', (
      select jsonb_build_object(
        'DRAFT', count(*) filter (where status = 'DRAFT'),
        'PUBLISHED', count(*) filter (where status = 'PUBLISHED' and application_deadline >= now()),
        'CLOSED', count(*) filter (where status = 'CLOSED'),
        'EXPIRED', count(*) filter (where status = 'PUBLISHED' and application_deadline < now()),
        'hidden', count(*) filter (where hidden_at is not null))
      from public.job_postings),
    'applications', (
      select jsonb_object_agg(s.status, (select count(*) from public.applications a where a.status = s.status))
      from unnest(array['SUBMITTED', 'REVIEWING', 'INTERVIEWING', 'OFFERED', 'HIRED', 'REJECTED', 'WITHDRAWN']) s(status)),
    'daily', (
      select jsonb_agg(jsonb_build_object(
        'date', d::date,
        'signups', (select count(*) from public.profiles x
                    where (x.created_at at time zone 'Asia/Ho_Chi_Minh')::date = d::date),
        'applications', (select count(*) from public.applications x
                         where (x.created_at at time zone 'Asia/Ho_Chi_Minh')::date = d::date),
        'postings', (select count(*) from public.job_postings x
                     where (x.created_at at time zone 'Asia/Ho_Chi_Minh')::date = d::date))
        order by d)
      from generate_series(v_today - 29, v_today, interval '1 day') d),
    'topCompanies', coalesce((
      select jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name, 'openPostings', t.open_postings,
                                          'applications', t.applications)
                       order by t.open_postings desc, t.applications desc, t.name)
      from (
        select c.id, c.name,
               (select count(*) from public.open_job_postings o where o.employer_id = c.id) as open_postings,
               (select count(*) from public.applications a join public.job_postings j on j.id = a.job_posting_id
                where j.employer_id = c.id) as applications
        from public.companies c
        order by 3 desc, 4 desc, c.name
        limit 5
      ) t), '[]'),
    'topIndustries', coalesce((
      select jsonb_agg(jsonb_build_object('industry', t.industry, 'openPostings', t.n) order by t.n desc, t.industry)
      from (
        select industry, count(*) as n from public.open_job_postings group by industry order by 2 desc, 1 limit 5
      ) t), '[]')
  );
end;
$$;

revoke execute on function public.admin_stats() from public, anon;
grant execute on function public.admin_stats() to authenticated;
