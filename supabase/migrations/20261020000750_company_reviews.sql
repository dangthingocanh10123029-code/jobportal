-- Ticket 45: company reviews. A Candidate who ever applied to one of the company's postings writes one review
-- (PENDING); an Admin approves or rejects it. Writes are RPC-only; errors carry the ReviewError code as message
-- (backend/app/modules/reviews/domain.py). The public reads APPROVED reviews through company_reviews_public,
-- which never exposes candidate_id.

create table public.company_reviews (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  candidate_id uuid not null references public.profiles (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  -- Same rule as ReviewInput (service) and submitReviewSchema (Zod).
  title text not null check (length(title) between 5 and 150 and title = btrim(title)),
  pros text not null check (length(pros) between 10 and 3000 and pros = btrim(pros)),
  cons text not null check (length(cons) between 10 and 3000 and cons = btrim(cons)),
  anonymous boolean not null default false,
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  reject_reason text check (reject_reason is null or length(reject_reason) between 5 and 500),
  moderated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, candidate_id),
  check ((status = 'REJECTED') = (reject_reason is not null))
);

create index company_reviews_approved_idx on public.company_reviews (company_id, created_at desc, id)
  where status = 'APPROVED';
create index company_reviews_status_idx on public.company_reviews (status, created_at desc, id);
create index company_reviews_candidate_idx on public.company_reviews (candidate_id);

alter table public.company_reviews enable row level security;
revoke all on public.company_reviews from anon, authenticated;
grant select on public.company_reviews to authenticated;
-- Two policies, not one OR: is_admin() costs a lookup only when the first does not match.
create policy company_reviews_select_own on public.company_reviews for select to authenticated
  using (candidate_id = (select auth.uid()));
create policy company_reviews_select_admin on public.company_reviews for select to authenticated
  using (public.is_admin());

-- The CompanyReview type of docs/api-contract.md §45. Owner rights on purpose: the table's RLS hides other
-- people's rows, and this view is the one public window onto them (APPROVED only, no candidate_id).
create view public.company_reviews_public with (security_invoker = false) as
  select r.id, r.company_id, r.rating, r.title, r.pros, r.cons, r.anonymous,
         case when r.anonymous then 'Ứng viên ẩn danh' else coalesce(p.full_name, 'Ứng viên') end as author_name,
         r.created_at
  from public.company_reviews r
  join public.profiles p on p.id = r.candidate_id
  where r.status = 'APPROVED';

revoke all on public.company_reviews_public from anon, authenticated;
grant select on public.company_reviews_public to anon, authenticated;

-- create or replace only appends columns; one aggregate per company row, no extra round trip (CompanySummary).
create or replace view public.company_summaries with (security_invoker = true) as
  select c.id, c.name, c.logo_url, c.about, c.size, c.address, c.website,
    (select count(*) from public.open_job_postings o where o.employer_id = c.id)::int as open_postings,
    public.f_unaccent(c.name) as search_name,
    c.verified_at,
    s.rating,
    s.review_count
  from public.companies c
  cross join lateral (
    select round(avg(r.rating), 1)::float8 as rating, count(*)::int as review_count
    from public.company_reviews_public r where r.company_id = c.id
  ) s;

create or replace view public.admin_companies with (security_barrier = true) as
  select c.id, c.name, c.logo_url, c.about, c.size, c.address, c.website, c.verified_at,
         c.verified_at is not null as company_verified,
         (select count(*) from public.open_job_postings o where o.employer_id = c.id)::int as open_postings,
         u.email::text as employer_email,
         public.f_unaccent(c.name) as search_name,
         s.rating,
         s.review_count
  from public.companies c
  join auth.users u on u.id = c.id
  cross join lateral (
    select round(avg(r.rating), 1)::float8 as rating, count(*)::int as review_count
    from public.company_reviews_public r where r.company_id = c.id
  ) s
  where public.is_admin();

-- Every review with its company and author email, for /admin/reviews.
create view public.admin_reviews with (security_barrier = true) as
  select r.id, r.company_id, r.rating, r.title, r.pros, r.cons, r.anonymous,
         case when r.anonymous then 'Ứng viên ẩn danh' else coalesce(p.full_name, 'Ứng viên') end as author_name,
         r.created_at, r.status, r.reject_reason, co.name as company_name, u.email::text as author_email
  from public.company_reviews r
  join public.companies co on co.id = r.company_id
  join public.profiles p on p.id = r.candidate_id
  join auth.users u on u.id = r.candidate_id
  where public.is_admin();

revoke all on public.admin_reviews from anon, authenticated;
grant select on public.admin_reviews to authenticated;

alter table public.admin_audit_log
  drop constraint admin_audit_log_action_check,
  add constraint admin_audit_log_action_check check (action in (
    'USER_LOCKED', 'USER_UNLOCKED', 'POSTING_HIDDEN', 'POSTING_UNHIDDEN', 'COMPANY_VERIFIED', 'COMPANY_UNVERIFIED',
    'ARTICLE_PUBLISHED', 'ARTICLE_UNPUBLISHED', 'REVIEW_APPROVED', 'REVIEW_REJECTED')),
  drop constraint admin_audit_log_target_type_check,
  add constraint admin_audit_log_target_type_check check (
    target_type in ('USER', 'POSTING', 'COMPANY', 'ARTICLE', 'REVIEW'));

-- The caller ever applied to one of the company's postings (any status, even hidden or withdrawn).
create function public.review_eligible(p_company_id uuid) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.applications a
    join public.job_postings p on p.id = a.job_posting_id
    where a.candidate_id = auth.uid() and p.employer_id = p_company_id)
$$;

create function public.can_review_company(p_company_id uuid) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.review_eligible(p_company_id)
     and not exists (select 1 from public.company_reviews where company_id = p_company_id and candidate_id = auth.uid())
$$;

-- New review → PENDING; a REJECTED one may be rewritten (→ PENDING again); PENDING/APPROVED stay as they are.
create function public.submit_review(
  p_company_id uuid, p_rating integer, p_title text, p_pros text, p_cons text, p_anonymous boolean
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_rating is null or p_rating not between 1 and 5
     or length(btrim(p_title)) not between 5 and 150
     or length(btrim(p_pros)) not between 10 and 3000
     or length(btrim(p_cons)) not between 10 and 3000
     or p_anonymous is null then
    raise exception 'INVALID_REVIEW';
  end if;
  if not public.review_eligible(p_company_id) then
    raise exception 'NOT_ELIGIBLE';
  end if;

  insert into public.company_reviews (company_id, candidate_id, rating, title, pros, cons, anonymous)
  values (p_company_id, auth.uid(), p_rating, btrim(p_title), btrim(p_pros), btrim(p_cons), p_anonymous)
  on conflict (company_id, candidate_id) do update
    set rating = excluded.rating, title = excluded.title, pros = excluded.pros, cons = excluded.cons,
        anonymous = excluded.anonymous, status = 'PENDING', reject_reason = null, moderated_at = null,
        updated_at = now()
    where public.company_reviews.status = 'REJECTED'
  returning id into v_id;
  if v_id is null then
    raise exception 'REVIEW_EXISTS';
  end if;
  return v_id;
end;
$$;

-- Approve or reject (reason 5–500) from any status; audit + REVIEW_MODERATED notification to the author.
create function public.admin_moderate_review(p_id uuid, p_approve boolean, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_review public.company_reviews;
  v_reason text;
  v_company text;
begin
  perform public.admin_require();
  if not p_approve then
    v_reason := public.admin_reason(p_reason);
  end if;
  update public.company_reviews
  set status = case when p_approve then 'APPROVED' else 'REJECTED' end,
      reject_reason = v_reason, moderated_at = now(), updated_at = now()
  where id = p_id
  returning * into v_review;
  if not found then
    raise exception 'REVIEW_NOT_FOUND';
  end if;
  select name into v_company from public.companies where id = v_review.company_id;

  perform public.admin_audit(
    case when p_approve then 'REVIEW_APPROVED' else 'REVIEW_REJECTED' end,
    'REVIEW', v_review.id, v_review.title,
    jsonb_strip_nulls(jsonb_build_object('companyId', v_review.company_id::text, 'companyName', v_company,
                                         'reason', v_reason)));

  insert into public.notifications (recipient_id, type, title, body, link)
  values (v_review.candidate_id, 'REVIEW_MODERATED',
          case when p_approve then 'Đánh giá đã được duyệt' else 'Đánh giá chưa được duyệt' end,
          case when p_approve then format('Đánh giá "%s" về %s đã hiển thị công khai.', v_review.title, v_company)
               else format('Đánh giá "%s" về %s bị từ chối: %s', v_review.title, v_company, v_reason) end,
          format('/companies/%s', v_review.company_id));
end;
$$;

revoke execute on function public.review_eligible(uuid) from public, anon, authenticated;
revoke execute on function public.can_review_company(uuid) from public, anon;
revoke execute on function public.submit_review(uuid, integer, text, text, text, boolean) from public, anon;
revoke execute on function public.admin_moderate_review(uuid, boolean, text) from public, anon;
grant execute on function public.can_review_company(uuid) to authenticated;
grant execute on function public.submit_review(uuid, integer, text, text, text, boolean) to authenticated;
grant execute on function public.admin_moderate_review(uuid, boolean, text) to authenticated;
