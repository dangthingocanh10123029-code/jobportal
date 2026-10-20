-- Ticket 40: interviews scheduled by the Employer on an Application, answered by its Candidate.
-- Written only through the RPCs below (security definer, actor = auth.uid()); errors carry the
-- InterviewError code as message (backend/app/modules/interviews/domain.py).

create table public.interviews (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  scheduled_at timestamptz not null,
  duration_minutes integer not null check (duration_minutes between 15 and 240),
  mode text not null check (mode in ('ONLINE', 'ONSITE')),
  location text not null,
  note text check (note is null or length(note) between 1 and 1000),
  status text not null default 'PROPOSED'
    check (status in ('PROPOSED', 'CONFIRMED', 'DECLINED', 'RESCHEDULE_REQUESTED', 'CANCELLED', 'DONE')),
  candidate_note text check (candidate_note is null or length(candidate_note) between 1 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Same rules as InterviewInput (Pydantic) and scheduleInterviewSchema (Zod).
  constraint interviews_location_valid check (
    case mode
      when 'ONLINE' then location ~* '^https?://\S+$' and length(location) <= 500
      else length(location) between 5 and 300 and location = btrim(location)
    end
  ),
  constraint interviews_reschedule_has_note check (status <> 'RESCHEDULE_REQUESTED' or candidate_note is not null)
);

-- At most one pending (PROPOSED/CONFIRMED) interview per Application.
create unique index interviews_one_pending_per_application on public.interviews (application_id)
  where status in ('PROPOSED', 'CONFIRMED');
create index interviews_scheduled_at_idx on public.interviews (scheduled_at);

create trigger interviews_set_updated_at
  before update on public.interviews
  for each row execute function public.set_updated_at();

alter table public.interviews enable row level security;

-- Readable by whoever can read the Application: its Candidate or the posting's Employer.
create policy interviews_select on public.interviews
  for select to authenticated
  using (exists (select 1 from public.applications a where a.id = application_id));

revoke all on public.interviews from anon, authenticated;
grant select on public.interviews to authenticated;

-- The Interview type of docs/api-contract.md §40. Definer view (like candidate_application_summaries) so each
-- side sees the other's name; the where keeps it to the caller's own interviews, also for hidden postings.
create view public.interview_details with (security_invoker = false) as
  select i.id, i.application_id, a.job_posting_id as posting_id, p.title as posting_title,
         co.name as company_name, coalesce(c.full_name, 'Ứng viên') as candidate_name,
         i.scheduled_at, i.duration_minutes, i.mode, i.location, i.note, i.status, i.candidate_note,
         i.created_at, i.updated_at, a.candidate_id, p.employer_id
  from public.interviews i
  join public.applications a on a.id = i.application_id
  join public.job_postings p on p.id = a.job_posting_id
  join public.companies co on co.id = p.employer_id
  join public.profiles c on c.id = a.candidate_id
  where (select auth.uid()) in (a.candidate_id, p.employer_id);

revoke all on public.interview_details from anon, authenticated;
grant select on public.interview_details to authenticated;

alter table public.notifications
  drop constraint notifications_type_check,
  -- All v5 types at once (contract §v5), so tickets 43–47 need not rewrite this list again.
  add constraint notifications_type_check check (type in (
    'APPLICATION_RECEIVED', 'APPLICATION_STATUS_CHANGED', 'APPLICATION_WITHDRAWN', 'POSTING_HIDDEN',
    'INTERVIEW_SCHEDULED', 'INTERVIEW_RESPONDED', 'INTERVIEW_CANCELLED',
    'TALENT_INVITED', 'JOB_ALERT', 'REVIEW_MODERATED', 'ORDER_PAID'));

-- 'HH24:MI DD/MM/YYYY' in Vietnam time, for notification bodies.
create function public.interview_time_label(p_at timestamptz) returns text
  language sql stable parallel safe
  set search_path = ''
as $$
  select to_char(p_at at time zone 'Asia/Ho_Chi_Minh', 'HH24:MI DD/MM/YYYY')
$$;

-- Employer of the posting; Application REVIEWING (moved to INTERVIEWING through change_application_status, so
-- the history and its notification stay the same) or INTERVIEWING; time in (now, now + 90 days].
create function public.schedule_interview(
  p_application_id uuid, p_scheduled_at timestamptz, p_duration_minutes integer, p_mode text, p_location text,
  p_note text default null
) returns public.interview_details
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_application public.applications;
  v_id uuid;
  v_result public.interview_details;
begin
  -- FOR UPDATE serializes two schedules (and status changes) on one Application.
  select a.* into v_application
  from public.applications a
  join public.job_postings p on p.id = a.job_posting_id
  where a.id = p_application_id and p.employer_id = auth.uid()
  for update of a;
  if not found then
    raise exception 'APPLICATION_NOT_FOUND';
  end if;
  if v_application.status not in ('REVIEWING', 'INTERVIEWING') then
    raise exception 'APPLICATION_NOT_INTERVIEWABLE';
  end if;
  if p_scheduled_at is null or p_scheduled_at <= now() or p_scheduled_at > now() + interval '90 days' then
    raise exception 'INVALID_SCHEDULE_TIME';
  end if;
  if exists (select 1 from public.interviews
             where application_id = p_application_id and status in ('PROPOSED', 'CONFIRMED')) then
    raise exception 'INTERVIEW_ALREADY_PENDING';
  end if;

  if v_application.status = 'REVIEWING' then
    perform public.change_application_status(p_application_id, 'INTERVIEWING');
  end if;

  insert into public.interviews (application_id, scheduled_at, duration_minutes, mode, location, note)
  values (p_application_id, p_scheduled_at, p_duration_minutes, p_mode, btrim(p_location), nullif(btrim(p_note), ''))
  returning id into v_id;

  insert into public.notifications (recipient_id, type, title, body, link)
  select d.candidate_id, 'INTERVIEW_SCHEDULED', 'Lịch phỏng vấn mới',
         format('%s mời bạn phỏng vấn tin "%s" lúc %s.', d.company_name, d.posting_title,
                public.interview_time_label(d.scheduled_at)),
         format('/candidate/applications/%s', d.application_id)
  from public.interview_details d where d.id = v_id;

  select * into v_result from public.interview_details where id = v_id;
  return v_result;
end;
$$;

-- Candidate of the Application, only while PROPOSED; RESCHEDULE needs a note (the time they would like).
create function public.respond_interview(p_interview_id uuid, p_response text, p_note text default null)
returns public.interview_details
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_interview public.interviews;
  v_note text := nullif(btrim(p_note), '');
  v_result public.interview_details;
begin
  select i.* into v_interview
  from public.interviews i
  join public.applications a on a.id = i.application_id
  where i.id = p_interview_id and a.candidate_id = auth.uid()
  for update of i;
  if not found then
    raise exception 'INTERVIEW_NOT_FOUND';
  end if;
  if p_response is null or p_response not in ('CONFIRM', 'DECLINE', 'RESCHEDULE') then
    raise exception 'INVALID_RESPONSE';
  end if;
  if v_interview.status <> 'PROPOSED' then
    raise exception 'INVALID_INTERVIEW_STATE';
  end if;
  if p_response = 'RESCHEDULE' and v_note is null then
    raise exception 'RESCHEDULE_NOTE_REQUIRED';
  end if;

  update public.interviews
  set status = case p_response when 'CONFIRM' then 'CONFIRMED' when 'DECLINE' then 'DECLINED'
                               else 'RESCHEDULE_REQUESTED' end,
      candidate_note = v_note
  where id = p_interview_id;

  insert into public.notifications (recipient_id, type, title, body, link)
  select d.employer_id, 'INTERVIEW_RESPONDED', 'Ứng viên đã phản hồi lịch phỏng vấn',
         format('%s đã %s lịch phỏng vấn tin "%s" lúc %s.', d.candidate_name,
                case p_response when 'CONFIRM' then 'xác nhận' when 'DECLINE' then 'từ chối' else 'xin đổi giờ' end,
                d.posting_title, public.interview_time_label(d.scheduled_at))
           || coalesce(format(' Ghi chú: %s', v_note), ''),
         format('/employer/postings/%s/applications', d.posting_id)
  from public.interview_details d where d.id = p_interview_id;

  select * into v_result from public.interview_details where id = p_interview_id;
  return v_result;
end;
$$;

-- Employer of the posting; PROPOSED, CONFIRMED or RESCHEDULE_REQUESTED. The reason goes only into the notification.
create function public.cancel_interview(p_interview_id uuid, p_reason text default null)
returns public.interview_details
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_interview public.interviews;
  v_reason text := nullif(btrim(p_reason), '');
  v_result public.interview_details;
begin
  select i.* into v_interview
  from public.interviews i
  join public.applications a on a.id = i.application_id
  join public.job_postings p on p.id = a.job_posting_id
  where i.id = p_interview_id and p.employer_id = auth.uid()
  for update of i;
  if not found then
    raise exception 'INTERVIEW_NOT_FOUND';
  end if;
  if length(v_reason) > 500 then
    raise exception 'INVALID_CANCEL_REASON';
  end if;
  if v_interview.status not in ('PROPOSED', 'CONFIRMED', 'RESCHEDULE_REQUESTED') then
    raise exception 'INVALID_INTERVIEW_STATE';
  end if;

  update public.interviews set status = 'CANCELLED' where id = p_interview_id;

  insert into public.notifications (recipient_id, type, title, body, link)
  select d.candidate_id, 'INTERVIEW_CANCELLED', 'Lịch phỏng vấn bị hủy',
         format('%s đã hủy lịch phỏng vấn tin "%s" lúc %s.', d.company_name, d.posting_title,
                public.interview_time_label(d.scheduled_at))
           || coalesce(format(' Lý do: %s', v_reason), ''),
         format('/candidate/applications/%s', d.application_id)
  from public.interview_details d where d.id = p_interview_id;

  select * into v_result from public.interview_details where id = p_interview_id;
  return v_result;
end;
$$;

-- Employer of the posting; CONFIRMED and the scheduled time has come.
create function public.mark_interview_done(p_interview_id uuid) returns public.interview_details
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_interview public.interviews;
  v_result public.interview_details;
begin
  select i.* into v_interview
  from public.interviews i
  join public.applications a on a.id = i.application_id
  join public.job_postings p on p.id = a.job_posting_id
  where i.id = p_interview_id and p.employer_id = auth.uid()
  for update of i;
  if not found then
    raise exception 'INTERVIEW_NOT_FOUND';
  end if;
  if v_interview.status <> 'CONFIRMED' then
    raise exception 'INVALID_INTERVIEW_STATE';
  end if;
  if v_interview.scheduled_at > now() then
    raise exception 'INTERVIEW_NOT_DUE';
  end if;

  update public.interviews set status = 'DONE' where id = p_interview_id;

  select * into v_result from public.interview_details where id = p_interview_id;
  return v_result;
end;
$$;

revoke execute on function public.schedule_interview(uuid, timestamptz, integer, text, text, text) from public, anon;
revoke execute on function public.respond_interview(uuid, text, text) from public, anon;
revoke execute on function public.cancel_interview(uuid, text) from public, anon;
revoke execute on function public.mark_interview_done(uuid) from public, anon;
grant execute on function public.schedule_interview(uuid, timestamptz, integer, text, text, text) to authenticated;
grant execute on function public.respond_interview(uuid, text, text) to authenticated;
grant execute on function public.cancel_interview(uuid, text) to authenticated;
grant execute on function public.mark_interview_done(uuid) to authenticated;
