-- Ticket 43: 20 of the 30 demo Candidates (every n not divisible by 3) open to work, with a location and
-- years of experience (= `years` in seed-demo.sql's demo_candidate); the other 10 stay hidden from talent search.
-- Run as postgres after the talent migration and seed-demo.sql: psql "$DATABASE_URL" -f supabase/seed/talent.sql
-- Idempotent: every demo Candidate is set again on each run.
\set ON_ERROR_STOP 1
begin;
update public.profiles p set
  open_to_work = d.n % 3 <> 0,
  location = (array['Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ', 'Bình Dương'])[1 + d.n % 6],
  experience_years = d.years
from (values (1, 3), (2, 5), (3, 1), (4, 2), (5, 4), (6, 6), (7, 0), (8, 3), (9, 2), (10, 7), (11, 1), (12, 5),
             (13, 0), (14, 3), (15, 2), (16, 8), (17, 2), (18, 4), (19, 3), (20, 2), (21, 1), (22, 4), (23, 0),
             (24, 6), (25, 3), (26, 1), (27, 2), (28, 10), (29, 5), (30, 3)) d (n, years)
-- = pg_temp.demo_uuid('demo-candidate-' || n) in seed-demo.sql
where p.id = overlay(overlay(md5('demo-candidate-' || d.n) placing '4' from 13) placing '8' from 17)::uuid
  and p.role = 'CANDIDATE';
select count(*) filter (where open_to_work) as open_to_work, count(*) as demo_candidates
from public.profiles p join auth.users u on u.id = p.id
where u.email like '%@demo.jobportal.test' and p.role = 'CANDIDATE';
commit;
