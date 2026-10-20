-- E2E fixtures: two confirmed users (no OTP email sent). Password: E2eTest!2026
\set ON_ERROR_STOP 1
begin;
with u(id, email, meta) as (values
  ('e2e00000-0000-4000-8000-0000000000e1'::uuid, 'e2e.employer@jobportal.test', '{"role":"EMPLOYER","company_name":"Công ty E2E"}'::jsonb),
  ('e2e00000-0000-4000-8000-0000000000c1'::uuid, 'e2e.candidate@jobportal.test', '{"role":"CANDIDATE","full_name":"Ứng viên E2E"}'::jsonb)
)
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current, reauthentication_token, phone_change, phone_change_token)
select '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated', email,
  extensions.crypt('E2eTest!2026', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', meta, now(), now(), '', '', '', '', '', '', '', ''
from u;
insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), id, id::text, 'email', jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true), now(), now(), now()
from auth.users where email like 'e2e.%@jobportal.test';
-- Second open posting: the candidate applies here with the online CV (the first posting gets the PDF).
insert into public.job_postings (id, employer_id, title, description, location, employment_type, industry, application_deadline, status)
values ('e2e00000-0000-4000-8000-0000000000a3', 'e2e00000-0000-4000-8000-0000000000e1', 'Chuyên viên nhân sự CV online E2E',
  'Tuyển dụng, đào tạo và chăm lo đời sống nhân viên cho công ty.', 'Hà Nội', 'FULL_TIME', 'HR', now() + interval '7 days', 'PUBLISHED');
select email, (select role from public.profiles p where p.id = u.id) from auth.users u where email like 'e2e.%@jobportal.test';
commit;
