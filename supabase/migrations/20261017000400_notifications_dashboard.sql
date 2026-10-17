-- Ticket 17: in-app notifications (written only by the triggers below) + posting views for the Employer dashboard.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('APPLICATION_RECEIVED', 'APPLICATION_STATUS_CHANGED', 'APPLICATION_WITHDRAWN')),
  title text not null,
  body text not null,
  link text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_recipient_created_idx on public.notifications (recipient_id, created_at desc);

alter table public.notifications enable row level security;

create policy notifications_select_own on public.notifications
  for select to authenticated
  using (recipient_id = (select auth.uid()));

create policy notifications_update_own on public.notifications
  for update to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

-- No insert/delete policy: rows come from the triggers and go with the recipient's profile.
revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

-- Mirrors applicationStatusLabels in src/components/format.ts.
create function public.application_status_label(status text) returns text
  language sql immutable parallel safe
  set search_path = ''
as $$
  select case status
    when 'SUBMITTED' then 'Đã nộp'
    when 'REVIEWING' then 'Đang xem xét'
    when 'INTERVIEWING' then 'Phỏng vấn'
    when 'OFFERED' then 'Đã gửi đề nghị'
    when 'HIRED' then 'Đã tuyển dụng'
    when 'REJECTED' then 'Không phù hợp'
    when 'WITHDRAWN' then 'Đã rút hồ sơ'
  end
$$;

-- New Application → the posting's Employer.
create function public.notify_application_received() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications (recipient_id, type, title, body, link)
  select p.employer_id, 'APPLICATION_RECEIVED', 'Có đơn ứng tuyển mới',
         format('%s vừa nộp đơn vào tin "%s".', coalesce(c.full_name, 'Một ứng viên'), p.title),
         format('/employer/postings/%s/applications', p.id)
  from public.job_postings p
  join public.profiles c on c.id = new.candidate_id
  where p.id = new.job_posting_id;
  return null;
end;
$$;

create trigger applications_notify_received
  after insert on public.applications
  for each row execute function public.notify_application_received();

-- Employer moves an Application → its Candidate; Candidate withdraws → the posting's Employer.
-- The submit entry (from_status null) is covered by notify_application_received.
create function public.notify_application_status_changed() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.to_status = 'WITHDRAWN' then
    insert into public.notifications (recipient_id, type, title, body, link)
    select p.employer_id, 'APPLICATION_WITHDRAWN', 'Ứng viên đã rút đơn',
           format('%s đã rút đơn ứng tuyển tin "%s".', coalesce(c.full_name, 'Một ứng viên'), p.title),
           format('/employer/postings/%s/applications', p.id)
    from public.applications a
    join public.job_postings p on p.id = a.job_posting_id
    join public.profiles c on c.id = a.candidate_id
    where a.id = new.application_id;
  elsif new.changed_by_role = 'EMPLOYER' then
    insert into public.notifications (recipient_id, type, title, body, link)
    select a.candidate_id, 'APPLICATION_STATUS_CHANGED', 'Đơn ứng tuyển được cập nhật',
           format('Đơn ứng tuyển tin "%s" đã chuyển sang trạng thái "%s".', p.title, public.application_status_label(new.to_status)),
           format('/candidate/applications/%s', a.id)
    from public.applications a
    join public.job_postings p on p.id = a.job_posting_id
    where a.id = new.application_id;
  end if;
  return null;
end;
$$;

create trigger application_status_changes_notify
  after insert on public.application_status_changes
  for each row when (new.from_status is not null)
  execute function public.notify_application_status_changed();

-- Security advisor: security definer trigger functions must not be callable via /rest/v1/rpc.
revoke execute on function public.notify_application_received() from public, anon, authenticated;
revoke execute on function public.notify_application_status_changed() from public, anon, authenticated;

-- Views live outside job_postings so counting one does not touch its updated_at.
create table public.posting_views (
  posting_id uuid primary key references public.job_postings (id) on delete cascade,
  view_count integer not null default 0 check (view_count >= 0)
);

alter table public.posting_views enable row level security;

create policy posting_views_select_own on public.posting_views
  for select to authenticated
  using (exists (select 1 from public.job_postings p where p.id = posting_id and p.employer_id = (select auth.uid())));

-- No write policy: counts change only through record_posting_view.
revoke all on public.posting_views from anon, authenticated;
grant select on public.posting_views to authenticated;

-- One view of a public posting (PUBLISHED/CLOSED) by anyone but its Employer; otherwise a no-op.
create function public.record_posting_view(p_posting_id uuid) returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.posting_views as v (posting_id, view_count)
  select p.id, 1
  from public.job_postings p
  where p.id = p_posting_id
    and p.status in ('PUBLISHED', 'CLOSED')
    and p.employer_id is distinct from auth.uid()
  on conflict (posting_id) do update set view_count = v.view_count + 1;
$$;

revoke execute on function public.record_posting_view(uuid) from public, anon;
grant execute on function public.record_posting_view(uuid) to anon, authenticated;

-- Employer dashboard in one query: own postings with views and Application counts per status.
-- security_invoker keeps RLS of job_postings/applications/posting_views; the where makes it own rows only.
create view public.employer_posting_stats with (security_invoker = true) as
  select p.id, p.employer_id, p.title, p.status, p.application_deadline, p.created_at,
         coalesce(v.view_count, 0) as views,
         coalesce(a.by_status, '{}'::jsonb) as applications_by_status
  from public.job_postings p
  left join public.posting_views v on v.posting_id = p.id
  left join lateral (
    select jsonb_object_agg(s.status, s.n) as by_status
    from (select status, count(*) as n from public.applications where job_posting_id = p.id group by status) s
  ) a on true
  where p.employer_id = (select auth.uid());

revoke all on public.employer_posting_stats from anon, authenticated;
grant select on public.employer_posting_stats to authenticated;
