-- Ticket 44: job alerts (saved search filters → JOB_ALERT notifications) and recommended postings.
-- The 5-alert limit raises the AlertError code as message (backend/app/modules/alerts/domain.py).

-- filter is an AlertFilter (contract §44) with camelCase keys, at least one condition; same rules as
-- backend/app/modules/alerts/schemas.py and alerts-schema.ts.
create function public.job_alert_filter_valid(f jsonb) returns boolean
  language sql immutable parallel safe
  set search_path = ''
as $$
  select jsonb_typeof(f) = 'object'
    and f <> '{}'::jsonb
    and (select bool_and(k in ('q', 'location', 'employmentType', 'industry', 'level', 'minSalary'))
         from jsonb_object_keys(f) k)
    and (not f ? 'q' or (jsonb_typeof(f->'q') = 'string' and length(btrim(f->>'q')) between 1 and 100))
    and (not f ? 'location'
         or (jsonb_typeof(f->'location') = 'string' and length(btrim(f->>'location')) between 1 and 100))
    and (not f ? 'employmentType' or f->>'employmentType' in ('FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'CONTRACT'))
    and (not f ? 'industry' or f->>'industry' in (
      'IT_SOFTWARE', 'SALES', 'MARKETING', 'ACCOUNTING_FINANCE', 'HR', 'ADMIN', 'CUSTOMER_SERVICE', 'EDUCATION',
      'HEALTHCARE', 'CONSTRUCTION', 'MANUFACTURING', 'LOGISTICS', 'HOSPITALITY', 'DESIGN', 'LEGAL', 'OTHER'))
    and (not f ? 'level' or f->>'level' in ('INTERN', 'FRESHER', 'JUNIOR', 'MIDDLE', 'SENIOR', 'LEAD', 'MANAGER'))
    and (not f ? 'minSalary' or (jsonb_typeof(f->'minSalary') = 'number'
         and (f->>'minSalary')::numeric between 1 and 9007199254740991
         and (f->>'minSalary')::numeric = trunc((f->>'minSalary')::numeric)))
$$;

create table public.job_alerts (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 100),
  filter jsonb not null check (public.job_alert_filter_valid(filter)),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  last_matched_at timestamptz
);

create index job_alerts_candidate_created_idx on public.job_alerts (candidate_id, created_at);
create index job_alerts_active_idx on public.job_alerts (candidate_id) where active;

-- At most 5 per Candidate; the lock serializes one Candidate's concurrent inserts so the count cannot be raced.
create function public.job_alerts_limit() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('job_alerts:' || new.candidate_id::text, 0));
  if (select count(*) from public.job_alerts where candidate_id = new.candidate_id) >= 5 then
    raise exception 'ALERT_LIMIT';
  end if;
  return new;
end;
$$;

create trigger job_alerts_limit
  before insert on public.job_alerts
  for each row execute function public.job_alerts_limit();

alter table public.job_alerts enable row level security;

create policy job_alerts_select_own on public.job_alerts
  for select to authenticated
  using (candidate_id = (select auth.uid()));

create policy job_alerts_insert_own on public.job_alerts
  for insert to authenticated
  with check (
    candidate_id = (select auth.uid())
    and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'CANDIDATE')
  );

create policy job_alerts_update_own on public.job_alerts
  for update to authenticated
  using (candidate_id = (select auth.uid()))
  with check (candidate_id = (select auth.uid()));

create policy job_alerts_delete_own on public.job_alerts
  for delete to authenticated
  using (candidate_id = (select auth.uid()));

-- Only the on/off switch is editable; last_matched_at is written by the trigger below.
revoke all on public.job_alerts from anon, authenticated;
grant select, delete on public.job_alerts to authenticated;
grant insert (candidate_id, name, filter), update (active) on public.job_alerts to authenticated;

-- Same matching as the posting search (postings/postgres.py _where): accent-insensitive substring on
-- title+description and location, equality on the enums, salary_max null = negotiable always passes minSalary.
create function public.job_alert_matches(f jsonb, p public.job_postings) returns boolean
  language sql immutable parallel safe
  set search_path = ''
as $$
  select (not f ? 'q' or strpos(public.f_unaccent(p.title || ' ' || p.description), public.f_unaccent(btrim(f->>'q'))) > 0)
    and (not f ? 'location' or strpos(public.f_unaccent(p.location), public.f_unaccent(btrim(f->>'location'))) > 0)
    and (not f ? 'employmentType' or p.employment_type = f->>'employmentType')
    and (not f ? 'industry' or p.industry = f->>'industry')
    and (not f ? 'level' or p.level = f->>'level')
    and (not f ? 'minSalary' or p.salary_max is null or p.salary_max >= (f->>'minSalary')::numeric)
$$;

-- A posting becomes PUBLISHED (once: the status machine never returns to DRAFT) → one JOB_ALERT per active
-- matching alert of unlocked Candidates. Hidden postings notify no one; the posting's owner is never a Candidate.
create function public.job_postings_notify_alerts() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company text;
begin
  if new.status <> 'PUBLISHED' or new.hidden_at is not null
     or (tg_op = 'UPDATE' and old.status = 'PUBLISHED') then
    return null;
  end if;
  select company_name into v_company from public.employer_companies where employer_id = new.employer_id;

  with hits as (
    update public.job_alerts a set last_matched_at = now()
    from public.profiles c
    where a.active and c.id = a.candidate_id and c.role = 'CANDIDATE' and c.locked_at is null
      and a.candidate_id <> new.employer_id and public.job_alert_matches(a.filter, new)
    returning a.candidate_id, a.name
  )
  insert into public.notifications (recipient_id, type, title, body, link)
  select candidate_id, 'JOB_ALERT', 'Việc làm mới phù hợp',
         format('Tin "%s" của %s khớp thông báo việc làm "%s".', new.title, coalesce(v_company, 'nhà tuyển dụng'), name),
         format('/jobs/%s', new.id)
  from hits;
  return null;
end;
$$;

revoke execute on function public.job_postings_notify_alerts() from public, anon, authenticated;

create trigger job_postings_notify_alerts
  after insert or update of status on public.job_postings
  for each row execute function public.job_postings_notify_alerts();

-- Up to 10 open postings the caller (a Candidate) has not applied to, scored: each shared skill ×3, an industry
-- of a posting they applied to ×2, a location of their profile or of a posting they applied to ×1. Score 0 is
-- left out. Definer: applied postings may since be closed or hidden, which the caller can no longer read.
-- Mirrored by InMemoryAlertRepository.recommendations.
create function public.recommended_postings()
returns table (posting_id uuid, score int, match_reasons text[])
language sql
stable
security definer
set search_path = ''
as $$
  with me as (
    select id, public.f_unaccent_array(skills) as skills, public.f_unaccent(btrim(location)) as location
    from public.profiles where id = auth.uid() and role = 'CANDIDATE'
  ),
  applied as (
    select p.id, p.industry, public.f_unaccent(p.location) as location
    from public.applications a join public.job_postings p on p.id = a.job_posting_id
    where a.candidate_id = (select id from me)
  ),
  scored as (
    select o.id, o.created_at, o.location,
      array(select s from unnest(o.skills) s where public.f_unaccent(s) = any((select skills from me)::text[])) as skills,
      o.industry in (select industry from applied) as same_industry,
      (strpos(o.search_location, (select location from me)) > 0
        or o.search_location in (select location from applied)) as same_location
    from public.open_job_postings o
    where exists (select 1 from me) and o.id not in (select id from applied)
  )
  select id,
    3 * cardinality(skills) + case when same_industry then 2 else 0 end + case when same_location then 1 else 0 end,
    array_remove(array[
      case when cardinality(skills) > 0 then 'Khớp kỹ năng: ' || array_to_string(skills, ', ') end,
      case when same_industry then 'Cùng ngành với việc bạn đã ứng tuyển' end,
      case when same_location then 'Địa điểm phù hợp: ' || location end
    ], null)
  from scored
  where cardinality(skills) > 0 or same_industry or same_location
  order by 2 desc, created_at desc, id
  limit 10
$$;

revoke execute on function public.recommended_postings() from public, anon;
grant execute on function public.recommended_postings() to authenticated;
