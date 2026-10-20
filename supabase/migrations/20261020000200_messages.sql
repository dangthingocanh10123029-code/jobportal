-- Ticket 41: chat between an Application's Candidate and its posting's Employer.
-- Written only through the RPCs below (security definer, actor = auth.uid()); errors carry the
-- MessageError code as message (backend/app/modules/messages/domain.py). No notification per message.

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  -- Same rule as MessageInput (Pydantic) and sendMessageSchema (Zod).
  body text not null check (length(body) between 1 and 2000 and body = btrim(body)),
  -- clock_timestamp: messages sent in one transaction still get distinct, ordered times (paging cursor).
  created_at timestamptz not null default clock_timestamp(),
  read_at timestamptz
);

create index messages_application_created_idx on public.messages (application_id, created_at);
-- The 30-per-minute limit in send_message.
create index messages_sender_created_idx on public.messages (sender_id, created_at);

alter table public.messages enable row level security;

-- Readable by whoever can read the Application: its Candidate or the posting's Employer.
create policy messages_select on public.messages
  for select to authenticated
  using (exists (select 1 from public.applications a where a.id = application_id));

revoke all on public.messages from anon, authenticated;
grant select on public.messages to authenticated;

-- The Conversation type of docs/api-contract.md §41, one row per Application of the caller (either side).
-- Definer view (like interview_details) so each side sees the other's name, also for hidden postings;
-- the where keeps it to the caller's own Applications. Last message and unread count in the same query (no N+1).
create view public.conversations with (security_invoker = false) as
  select a.id as application_id, p.title as posting_title,
         case when me.uid = a.candidate_id then co.name else coalesce(c.full_name, 'Ứng viên') end as other_party_name,
         case when me.uid = a.candidate_id then co.logo_url end as other_party_logo_url,
         last.body as last_message, last.created_at as last_message_at,
         (select count(*) from public.messages m
          where m.application_id = a.id and m.sender_id <> me.uid and m.read_at is null)::int as unread,
         a.status not in ('WITHDRAWN', 'REJECTED', 'HIRED') as can_send,
         coalesce(last.created_at, a.created_at) as sort_at
  from (select auth.uid() as uid) me
  join public.applications a on true
  join public.job_postings p on p.id = a.job_posting_id
  join public.companies co on co.id = p.employer_id
  join public.profiles c on c.id = a.candidate_id
  left join lateral (
    select m.body, m.created_at from public.messages m
    where m.application_id = a.id order by m.created_at desc limit 1
  ) last on true
  where me.uid in (a.candidate_id, p.employer_id);

revoke all on public.conversations from anon, authenticated;
grant select on public.conversations to authenticated;

-- Either side of the Application; not once it is WITHDRAWN/REJECTED/HIRED; at most 30 messages per minute per sender.
create function public.send_message(p_application_id uuid, p_body text) returns public.messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
  v_body text := btrim(p_body);
  v_result public.messages;
begin
  select a.status into v_status
  from public.applications a
  join public.job_postings p on p.id = a.job_posting_id
  where a.id = p_application_id and auth.uid() in (a.candidate_id, p.employer_id);
  if not found then
    raise exception 'APPLICATION_NOT_FOUND';
  end if;
  if v_status in ('WITHDRAWN', 'REJECTED', 'HIRED') then
    raise exception 'CONVERSATION_CLOSED';
  end if;
  if v_body is null or length(v_body) not between 1 and 2000 then
    raise exception 'INVALID_MESSAGE';
  end if;
  -- Serializes one sender's concurrent sends so the count below cannot be raced past.
  perform pg_advisory_xact_lock(hashtextextended('send_message:' || auth.uid()::text, 0));
  if (select count(*) from public.messages
      where sender_id = auth.uid() and created_at > clock_timestamp() - interval '1 minute') >= 30 then
    raise exception 'MESSAGE_RATE_LIMITED';
  end if;

  insert into public.messages (application_id, sender_id, body)
  values (p_application_id, auth.uid(), v_body)
  returning * into v_result;
  return v_result;
end;
$$;

-- Either side; marks the other side's unread messages read. Allowed on closed Applications too.
create function public.mark_conversation_read(p_application_id uuid) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.applications a
                 join public.job_postings p on p.id = a.job_posting_id
                 where a.id = p_application_id and auth.uid() in (a.candidate_id, p.employer_id)) then
    raise exception 'APPLICATION_NOT_FOUND';
  end if;
  update public.messages set read_at = now()
  where application_id = p_application_id and sender_id <> auth.uid() and read_at is null;
end;
$$;

revoke execute on function public.send_message(uuid, text) from public, anon;
revoke execute on function public.mark_conversation_read(uuid) from public, anon;
grant execute on function public.send_message(uuid, text) to authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;
