-- Ticket 06: Candidate lists and withdraws Applications. The status RPC is shared with ticket 07 (Employer).

-- Candidate's list: Application + posting title + public company name. security_invoker keeps
-- applications RLS (Candidate sees own) and job_postings RLS (an applied posting is PUBLISHED or CLOSED).
create view public.candidate_application_summaries with (security_invoker = true) as
  select a.id, a.job_posting_id, a.candidate_id, a.status, a.created_at, a.updated_at,
         p.title as posting_title, p.company_name
  from public.applications a
  join public.job_postings_with_company p on p.id = a.job_posting_id;

revoke all on public.candidate_application_summaries from anon, authenticated;
grant select on public.candidate_application_summaries to authenticated;

-- Atomic status change for the signed-in actor (auth.uid()): locks the Application (FOR UPDATE) so two
-- concurrent changes serialize, checks the actor owns it (Candidate: own Application; Employer: own posting)
-- and the transition is legal for the actor's role, then writes the status and its Status Change together.
-- Errors carry the ApplicationErrorCode as message (src/modules/application/domain/errors.ts).
create function public.change_application_status(p_application_id uuid, p_to_status text) returns public.applications
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_application public.applications;
begin
  select role into v_role from public.profiles where id = v_uid;
  if v_role is null then
    raise exception 'only a signed-in user can change an application' using errcode = 'insufficient_privilege';
  end if;

  select a.* into v_application
  from public.applications a
  where a.id = p_application_id
    and case v_role
      when 'CANDIDATE' then a.candidate_id = v_uid
      else exists (select 1 from public.job_postings p where p.id = a.job_posting_id and p.employer_id = v_uid)
    end
  for update of a;
  -- Someone else's Application looks the same as a missing one.
  if not found then
    raise exception 'APPLICATION_NOT_FOUND';
  end if;

  if not public.application_transition_allowed(v_application.status, p_to_status, v_role) then
    raise exception 'INVALID_TRANSITION';
  end if;

  insert into public.application_status_changes (application_id, from_status, to_status, changed_by, changed_by_role)
  values (p_application_id, v_application.status, p_to_status, v_uid, v_role);

  update public.applications set status = p_to_status where id = p_application_id
  returning * into v_application;

  return v_application;
end;
$$;

revoke execute on function public.change_application_status(uuid, text) from public, anon;
grant execute on function public.change_application_status(uuid, text) to authenticated;
