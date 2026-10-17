-- Ticket 32 (spec 48): the only way to become ADMIN. Run as postgres:
--   psql "$DATABASE_URL" -v email=someone@example.com -f supabase/seed/make-admin.sql
-- The account must already exist (sign up as Candidate first). An Employer is refused: an Admin owning a
-- public company and postings would moderate their own content.
\set ON_ERROR_STOP 1
begin;
select set_config('make_admin.email', lower(:'email'), true);
do $$
declare
  v_id uuid;
  v_role text;
begin
  select p.id, p.role into v_id, v_role
  from auth.users u join public.profiles p on p.id = u.id
  where lower(u.email) = current_setting('make_admin.email');
  if v_id is null then
    raise exception 'no account with email %', current_setting('make_admin.email');
  elsif v_role = 'EMPLOYER' then
    raise exception 'refusing to promote an Employer account';
  end if;
  -- Candidate-only profile fields must be empty for any other role (candidate_profile_fields).
  update public.profiles
  set role = 'ADMIN', headline = null, skills = '{}', experience = null, education = null
  where id = v_id;
end $$;
commit;
select u.email, p.role from auth.users u join public.profiles p on p.id = u.id
where lower(u.email) = lower(:'email');
