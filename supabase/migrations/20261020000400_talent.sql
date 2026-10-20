-- Ticket 43: talent search. A Candidate opts in (open_to_work); Employers find, save and invite them.
-- Employers read Candidates only through talent_profiles, which never carries email or phone.
-- invite_talent errors carry the TalentError code as message (backend/app/modules/talent/domain.py).

alter table public.profiles
  add column open_to_work boolean not null default false,
  add column location text check (location is null or length(btrim(location)) between 1 and 150),
  add column experience_years int check (experience_years between 0 and 50),
  add constraint candidate_talent_fields check (
    role = 'CANDIDATE' or (not open_to_work and location is null and experience_years is null)
  );

-- Owner edits through profiles_update_own; non-Candidates are held empty by the CHECK above.
grant update (open_to_work, location, experience_years) on public.profiles to authenticated;

-- create or replace view only appends columns; the view keeps its owner rights and auth.uid() filter.
create or replace view public.employer_application_summaries as
  select a.id, a.job_posting_id, a.candidate_id, a.status, a.created_at, a.updated_at, a.resume_path,
         p.employer_id, c.full_name as candidate_name, c.phone as candidate_phone,
         c.headline as candidate_headline, c.skills as candidate_skills,
         c.experience as candidate_experience, c.education as candidate_education,
         a.cv_source, a.online_cv,
         c.open_to_work as candidate_open_to_work, c.location as candidate_location,
         c.experience_years as candidate_experience_years
  from public.applications a
  join public.job_postings p on p.id = a.job_posting_id
  join public.profiles c on c.id = a.candidate_id
  where p.employer_id = (select auth.uid());

create table public.saved_candidates (
  employer_id uuid not null references public.profiles (id) on delete cascade,
  candidate_id uuid not null references public.profiles (id) on delete cascade,
  note text check (note is null or length(btrim(note)) between 1 and 500),
  created_at timestamptz not null default now(),
  primary key (employer_id, candidate_id)
);

create table public.talent_invitations (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references public.profiles (id) on delete cascade,
  candidate_id uuid not null references public.profiles (id) on delete cascade,
  posting_id uuid not null references public.job_postings (id) on delete cascade,
  message text check (message is null or length(message) between 1 and 1000),
  created_at timestamptz not null default now(),
  unique (posting_id, candidate_id)
);

-- The 20-per-24-hours limit in invite_talent.
create index talent_invitations_employer_created_idx on public.talent_invitations (employer_id, created_at);

-- Open-to-work, unlocked Candidates, for a signed-in Employer only (empty for anyone else). Definer view:
-- profiles RLS hides other users' rows, so the column list here is the whole of what an Employer can see.
-- cv drops the contact details; `saved` is relative to the calling Employer.
create view public.talent_profiles with (security_invoker = false) as
  select p.id as candidate_id, p.full_name, p.headline, p.skills, p.location, p.experience_years,
         p.experience, p.education,
         cv.candidate_id is not null as has_online_cv,
         to_jsonb(cv) - 'email' - 'phone' as cv,
         greatest(p.updated_at, cv.updated_at) as updated_at,
         exists (select 1 from public.saved_candidates s
                 where s.employer_id = (select auth.uid()) and s.candidate_id = p.id) as saved,
         public.f_unaccent(concat_ws(' ', p.full_name, p.headline, array_to_string(p.skills, ' '), p.experience))
           as search_text,
         public.f_unaccent(p.location) as search_location,
         public.f_unaccent_array(p.skills) as search_skills
  from public.profiles p
  left join public.candidate_cvs cv on cv.candidate_id = p.id
  where p.role = 'CANDIDATE' and p.open_to_work and p.locked_at is null
    and exists (select 1 from public.profiles me where me.id = (select auth.uid()) and me.role = 'EMPLOYER');

revoke all on public.talent_profiles from anon, authenticated;
grant select on public.talent_profiles to authenticated;

alter table public.saved_candidates enable row level security;

create policy saved_candidates_select_own on public.saved_candidates
  for select to authenticated
  using (employer_id = (select auth.uid()));

-- Only Employers, for themselves, and only Candidates they can currently see (talent_profiles checks both).
create policy saved_candidates_insert_own on public.saved_candidates
  for insert to authenticated
  with check (
    employer_id = (select auth.uid())
    and exists (select 1 from public.talent_profiles t where t.candidate_id = saved_candidates.candidate_id)
  );

create policy saved_candidates_delete_own on public.saved_candidates
  for delete to authenticated
  using (employer_id = (select auth.uid()));

revoke all on public.saved_candidates from anon, authenticated;
grant select, insert, delete on public.saved_candidates to authenticated;

-- Written only by invite_talent; both sides may read.
alter table public.talent_invitations enable row level security;

create policy talent_invitations_select_own on public.talent_invitations
  for select to authenticated
  using ((select auth.uid()) in (employer_id, candidate_id));

revoke all on public.talent_invitations from anon, authenticated;
grant select on public.talent_invitations to authenticated;

-- Employer of an open posting invites a visible Candidate once per posting, at most 20 per 24 hours.
create function public.invite_talent(p_candidate_id uuid, p_posting_id uuid, p_message text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_message text := nullif(btrim(p_message), '');
  v_company text;
  v_title text;
begin
  if not exists (select 1 from public.talent_profiles where candidate_id = p_candidate_id) then
    raise exception 'TALENT_NOT_FOUND';
  end if;
  select o.company_name, o.title into v_company, v_title
  from public.open_job_postings o where o.id = p_posting_id and o.employer_id = auth.uid();
  if not found then
    raise exception 'POSTING_NOT_OPEN';
  end if;
  if length(v_message) > 1000 then
    raise exception 'INVALID_INVITE_MESSAGE';
  end if;
  -- Serializes one Employer's concurrent invites so the count below cannot be raced past.
  perform pg_advisory_xact_lock(hashtextextended('invite_talent:' || auth.uid()::text, 0));
  if (select count(*) from public.talent_invitations
      where employer_id = auth.uid() and created_at > now() - interval '24 hours') >= 20 then
    raise exception 'INVITE_LIMIT';
  end if;

  begin
    insert into public.talent_invitations (employer_id, candidate_id, posting_id, message)
    values (auth.uid(), p_candidate_id, p_posting_id, v_message);
  exception when unique_violation then
    raise exception 'ALREADY_INVITED';
  end;

  insert into public.notifications (recipient_id, type, title, body, link)
  values (p_candidate_id, 'TALENT_INVITED', 'Lời mời ứng tuyển',
          format('%s mời bạn ứng tuyển vị trí "%s".', v_company, v_title)
            || coalesce(format(' Lời nhắn: %s', v_message), ''),
          format('/jobs/%s', p_posting_id));
end;
$$;

revoke execute on function public.invite_talent(uuid, uuid, text) from public, anon;
grant execute on function public.invite_talent(uuid, uuid, text) to authenticated;
