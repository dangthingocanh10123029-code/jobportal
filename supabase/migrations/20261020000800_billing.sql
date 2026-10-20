-- Ticket 47: service packages and featured postings. PAYMENT IS SIMULATED: pay_order flips an order PENDING → PAID
-- with no payment gateway and no money taken. Writes are RPC-only; errors carry the BillingError code as message
-- (backend/app/modules/billing/domain.py).

create table public.service_packages (
  id uuid primary key default gen_random_uuid(),
  -- Same rules as PackageInput (service) and savePackageSchema (Zod).
  code text not null unique check (code ~ '^[A-Z0-9_]{2,30}$'),
  name text not null check (length(name) between 2 and 100 and name = btrim(name)),
  description text not null check (length(description) <= 500 and description = btrim(description)),
  price_vnd bigint not null check (price_vnd between 0 and 100000000),
  duration_days integer not null check (duration_days between 1 and 90),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.service_packages (code, name, description, price_vnd, duration_days) values
  ('TOP_7', 'Tin nổi bật 7 ngày', 'Tin hiển thị đầu danh sách và trong khối Việc làm nổi bật trên trang chủ trong 7 ngày.', 299000, 7),
  ('TOP_14', 'Tin nổi bật 14 ngày', 'Tin hiển thị đầu danh sách và trong khối Việc làm nổi bật trên trang chủ trong 14 ngày.', 499000, 14),
  ('TOP_30', 'Tin nổi bật 30 ngày', 'Tin hiển thị đầu danh sách và trong khối Việc làm nổi bật trên trang chủ trong 30 ngày.', 899000, 30);

alter table public.service_packages enable row level security;
revoke all on public.service_packages from anon, authenticated;
grant select on public.service_packages to anon, authenticated;
-- Two policies, not one OR: is_admin() is not executable by anon.
create policy service_packages_select_active on public.service_packages for select to anon, authenticated
  using (active);
create policy service_packages_select_admin on public.service_packages for select to authenticated
  using (public.is_admin());

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references public.profiles (id) on delete cascade,
  posting_id uuid not null references public.job_postings (id) on delete cascade,
  package_id uuid not null references public.service_packages (id),
  -- Copied at order time: a later price or duration change never alters an order.
  package_name text not null,
  duration_days integer not null check (duration_days between 1 and 90),
  amount_vnd bigint not null check (amount_vnd between 0 and 100000000),
  status text not null default 'PENDING' check (status in ('PENDING', 'PAID', 'CANCELLED')),
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  cancelled_at timestamptz,
  -- The posting's featured_until right after this payment.
  featured_until timestamptz,
  check ((status = 'PAID') = (paid_at is not null and featured_until is not null)),
  check ((status = 'CANCELLED') = (cancelled_at is not null))
);

-- One open order per posting: a second create_order waits for it to be paid or cancelled.
create unique index orders_one_pending_idx on public.orders (posting_id) where status = 'PENDING';
create index orders_employer_idx on public.orders (employer_id, created_at desc, id);
create index orders_created_idx on public.orders (created_at desc, id);
create index orders_paid_idx on public.orders (paid_at) where status = 'PAID';

alter table public.orders enable row level security;
revoke all on public.orders from anon, authenticated;
grant select on public.orders to authenticated;
create policy orders_select_own on public.orders for select to authenticated
  using (employer_id = (select auth.uid()));
create policy orders_select_admin on public.orders for select to authenticated
  using (public.is_admin());

-- No column grant: only pay_order sets it. featured = featured_until > now().
alter table public.job_postings add column featured_until timestamptz;

-- Featuring changes only featured_until on a PUBLISHED posting, so job_postings_guard lets it through.
create index job_postings_featured_idx on public.job_postings (featured_until) where featured_until is not null;

-- Posting views: create or replace only appends columns.
create or replace view public.job_postings_with_company with (security_invoker = true) as
  select p.id, p.employer_id, p.title, p.description, p.location, p.employment_type, p.salary_min, p.salary_max,
         p.application_deadline, p.status, p.created_at, p.updated_at, c.company_name,
         p.industry, p.level, p.experience_years, p.headcount, p.skills, p.requirements, p.benefits,
         c.company_logo_url, c.company_verified, p.hidden_at, p.hidden_reason,
         p.featured_until
  from public.job_postings p
  join public.employer_companies c on c.employer_id = p.employer_id;

create or replace view public.open_job_postings with (security_invoker = true) as
  select id, employer_id, title, description, location, employment_type, salary_min, salary_max,
    application_deadline, status, created_at, updated_at, company_name,
    public.f_unaccent(title || ' ' || description) as search_text,
    public.f_unaccent(location) as search_location,
    industry, level, experience_years, headcount, skills, requirements, benefits, company_logo_url,
    public.f_unaccent_array(skills) as search_skills,
    company_verified, hidden_at, hidden_reason,
    featured_until
  from public.job_postings_with_company
  where status = 'PUBLISHED' and application_deadline >= now() and hidden_at is null;

-- The Order type of docs/api-contract.md §47; the caller's RLS on orders and job_postings applies.
create view public.order_summaries with (security_invoker = true) as
  select o.id, o.employer_id, o.package_name, o.posting_id, p.title as posting_title, o.amount_vnd, o.status,
         o.created_at, o.paid_at, o.featured_until
  from public.orders o
  join public.job_postings p on p.id = o.posting_id;

revoke all on public.order_summaries from anon, authenticated;
grant select on public.order_summaries to authenticated;

-- Every order with the Employer's email and company, for /admin/orders.
create view public.admin_orders with (security_barrier = true) as
  select o.id, o.employer_id, o.package_name, o.posting_id, p.title as posting_title, o.amount_vnd, o.status,
         o.created_at, o.paid_at, o.featured_until, u.email::text as employer_email, c.name as company_name
  from public.orders o
  join public.job_postings p on p.id = o.posting_id
  join public.companies c on c.id = o.employer_id
  join auth.users u on u.id = o.employer_id
  where public.is_admin();

revoke all on public.admin_orders from anon, authenticated;
grant select on public.admin_orders to authenticated;

alter table public.admin_audit_log
  drop constraint admin_audit_log_action_check,
  add constraint admin_audit_log_action_check check (action in (
    'USER_LOCKED', 'USER_UNLOCKED', 'POSTING_HIDDEN', 'POSTING_UNHIDDEN', 'COMPANY_VERIFIED', 'COMPANY_UNVERIFIED',
    'ARTICLE_PUBLISHED', 'ARTICLE_UNPUBLISHED', 'REVIEW_APPROVED', 'REVIEW_REJECTED', 'PACKAGE_UPDATED')),
  drop constraint admin_audit_log_target_type_check,
  add constraint admin_audit_log_target_type_check check (
    target_type in ('USER', 'POSTING', 'COMPANY', 'ARTICLE', 'REVIEW', 'PACKAGE'));

-- The caller's own posting that is open right now (PUBLISHED, before its deadline, not hidden).
create function public.billing_posting_open(p_posting_id uuid) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.job_postings
    where id = p_posting_id and employer_id = auth.uid()
      and status = 'PUBLISHED' and application_deadline >= now() and hidden_at is null)
$$;

create function public.create_order(p_package_id uuid, p_posting_id uuid) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_package public.service_packages;
  v_id uuid;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'EMPLOYER') then
    raise exception 'NOT_EMPLOYER';
  end if;
  select * into v_package from public.service_packages where id = p_package_id and active;
  if not found then
    raise exception 'PACKAGE_NOT_FOUND';
  end if;
  if not public.billing_posting_open(p_posting_id) then
    raise exception 'POSTING_NOT_ELIGIBLE';
  end if;
  insert into public.orders (employer_id, posting_id, package_id, package_name, duration_days, amount_vnd)
  values (auth.uid(), p_posting_id, v_package.id, v_package.name, v_package.duration_days, v_package.price_vnd)
  returning id into v_id;
  return v_id;
exception
  when unique_violation then
    raise exception 'ORDER_PENDING_EXISTS';
end;
$$;

-- SIMULATED payment: no gateway, no money. Extends from the later of now and the current featured_until.
create function public.pay_order(p_order_id uuid) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_until timestamptz;
  v_title text;
begin
  select * into v_order from public.orders where id = p_order_id and employer_id = auth.uid() for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;
  if v_order.status <> 'PENDING' then
    raise exception 'ORDER_NOT_PENDING';
  end if;
  if not public.billing_posting_open(v_order.posting_id) then
    raise exception 'POSTING_NOT_ELIGIBLE';
  end if;

  -- The row lock serialises two payments for one posting; each extends the other's result.
  update public.job_postings
  set featured_until = greatest(now(), coalesce(featured_until, now())) + make_interval(days => v_order.duration_days)
  where id = v_order.posting_id
  returning featured_until, title into v_until, v_title;

  update public.orders set status = 'PAID', paid_at = now(), featured_until = v_until where id = p_order_id;

  insert into public.notifications (recipient_id, type, title, body, link)
  values (auth.uid(), 'ORDER_PAID', 'Thanh toán thành công',
          format('Tin "%s" được hiển thị nổi bật đến %s (thanh toán giả lập).', v_title,
                 to_char(v_until at time zone 'Asia/Ho_Chi_Minh', 'HH24:MI DD/MM/YYYY')),
          '/employer/billing');
end;
$$;

create function public.cancel_order(p_order_id uuid) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
begin
  select status into v_status from public.orders where id = p_order_id and employer_id = auth.uid() for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;
  if v_status <> 'PENDING' then
    raise exception 'ORDER_NOT_PENDING';
  end if;
  update public.orders set status = 'CANCELLED', cancelled_at = now() where id = p_order_id;
end;
$$;

-- Create (p_id null) or update a package; audit PACKAGE_UPDATED either way.
create function public.admin_save_package(
  p_id uuid, p_code text, p_name text, p_description text, p_price_vnd bigint, p_duration_days integer,
  p_active boolean
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform public.admin_require();
  if p_code is null or p_code !~ '^[A-Z0-9_]{2,30}$'
     or length(btrim(p_name)) not between 2 and 100
     or p_description is null or length(btrim(p_description)) > 500
     or p_price_vnd is null or p_price_vnd not between 0 and 100000000
     or p_duration_days is null or p_duration_days not between 1 and 90
     or p_active is null then
    raise exception 'INVALID_PACKAGE';
  end if;

  begin
    if p_id is null then
      insert into public.service_packages (code, name, description, price_vnd, duration_days, active)
      values (p_code, btrim(p_name), btrim(p_description), p_price_vnd, p_duration_days, p_active)
      returning id into v_id;
    else
      update public.service_packages
      set code = p_code, name = btrim(p_name), description = btrim(p_description), price_vnd = p_price_vnd,
          duration_days = p_duration_days, active = p_active, updated_at = now()
      where id = p_id
      returning id into v_id;
      if v_id is null then
        raise exception 'PACKAGE_NOT_FOUND';
      end if;
    end if;
  exception
    when unique_violation then
      raise exception 'PACKAGE_CODE_TAKEN';
  end;

  perform public.admin_audit('PACKAGE_UPDATED', 'PACKAGE', v_id, btrim(p_name),
    jsonb_build_object('code', p_code, 'priceVnd', p_price_vnd::text, 'durationDays', p_duration_days::text,
                       'active', p_active::text));
  return v_id;
end;
$$;

-- AdminStats gains revenue (contract §47). The ticket-32 body stays as admin_stats_base; redefine that one to
-- change the other figures.
alter function public.admin_stats() rename to admin_stats_base;

create function public.admin_stats() returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.admin_stats_base() || jsonb_build_object('revenue', (
    select jsonb_build_object(
      'paidOrders', count(*),
      'totalVnd', coalesce(sum(amount_vnd), 0),
      'last30DaysVnd', coalesce(sum(amount_vnd) filter (where paid_at >= now() - interval '30 days'), 0))
    from public.orders where status = 'PAID'))
$$;

revoke execute on function public.admin_stats_base() from public, anon, authenticated;
revoke execute on function public.billing_posting_open(uuid) from public, anon, authenticated;
revoke execute on function public.create_order(uuid, uuid) from public, anon;
revoke execute on function public.pay_order(uuid) from public, anon;
revoke execute on function public.cancel_order(uuid) from public, anon;
revoke execute on function public.admin_save_package(uuid, text, text, text, bigint, integer, boolean) from public, anon;
revoke execute on function public.admin_stats() from public, anon;
grant execute on function public.create_order(uuid, uuid) to authenticated;
grant execute on function public.pay_order(uuid) to authenticated;
grant execute on function public.cancel_order(uuid) to authenticated;
grant execute on function public.admin_save_package(uuid, text, text, text, bigint, integer, boolean) to authenticated;
grant execute on function public.admin_stats() to authenticated;
