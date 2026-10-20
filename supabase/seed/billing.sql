-- Ticket 47: sample orders of the SIMULATED payment and ~8 featured postings (no real money anywhere).
-- Run as postgres after seed-demo.sql and the billing migration:
--   psql "$DATABASE_URL" -f supabase/seed/billing.sql
-- Only demo accounts. Postings are picked by a fixed hash order among open demo postings, so reruns redo the same
-- set (dates follow now()); wipe-demo.sql removes the orders with their Employers (cascade).
\set ON_ERROR_STOP 1
begin;
delete from public.orders o using auth.users u where u.id = o.employer_id and u.email like '%@demo.jobportal.test';
update public.job_postings p set featured_until = null
from auth.users u where u.id = p.employer_id and u.email like '%@demo.jobportal.test' and p.featured_until is not null;

with picked as (
  select p.id, p.employer_id,
         row_number() over (order by md5(p.id::text)) as n
  from public.open_job_postings p
  join auth.users u on u.id = p.employer_id and u.email like '%@demo.jobportal.test'
),
plan (n, code, paid_days_ago) as (values
  (1, 'TOP_30', 3), (2, 'TOP_14', 1), (3, 'TOP_7', 2), (4, 'TOP_30', 10),
  (5, 'TOP_14', 5), (6, 'TOP_7', 0), (7, 'TOP_14', 8), (8, 'TOP_30', 20),
  -- Already ended: revenue only, not featured any more.
  (9, 'TOP_7', 40), (10, 'TOP_14', 45)
),
paid as (
  insert into public.orders (employer_id, posting_id, package_id, package_name, duration_days, amount_vnd, status,
                             created_at, paid_at, featured_until)
  select pk.employer_id, pk.id, sp.id, sp.name, sp.duration_days, sp.price_vnd, 'PAID',
         now() - make_interval(days => pl.paid_days_ago, mins => 15), now() - make_interval(days => pl.paid_days_ago),
         now() - make_interval(days => pl.paid_days_ago) + make_interval(days => sp.duration_days)
  from plan pl
  join picked pk on pk.n = pl.n
  join public.service_packages sp on sp.code = pl.code
  returning posting_id, featured_until
)
update public.job_postings p set featured_until = paid.featured_until
from paid where p.id = paid.posting_id and paid.featured_until > now();

-- One order still waiting for the (simulated) payment and one cancelled, so both states show up in /admin/orders.
insert into public.orders (employer_id, posting_id, package_id, package_name, duration_days, amount_vnd, status,
                           created_at, cancelled_at)
select p.employer_id, p.id, sp.id, sp.name, sp.duration_days, sp.price_vnd, s.status,
       now() - interval '2 hours', case when s.status = 'CANCELLED' then now() - interval '1 hour' end
from (values (11, 'PENDING'), (12, 'CANCELLED')) s(n, status)
join (
  select p.id, p.employer_id, row_number() over (order by md5(p.id::text)) as n
  from public.open_job_postings p
  join auth.users u on u.id = p.employer_id and u.email like '%@demo.jobportal.test'
) p on p.n = s.n
join public.service_packages sp on sp.code = 'TOP_7';

select count(*) filter (where featured_until > now()) as featured_postings from public.job_postings;
commit;
