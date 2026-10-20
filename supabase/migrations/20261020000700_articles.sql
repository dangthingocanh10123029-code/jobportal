-- Ticket 46: career guide articles. Writes and view counts are RPC-only; reads run under the caller's RLS.
create table public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 3 and 200),
  title text not null check (length(title) between 5 and 200),
  excerpt text not null check (length(excerpt) between 20 and 300),
  category text not null check (category in ('CV', 'INTERVIEW', 'SALARY', 'CAREER', 'WORKPLACE')),
  content text not null check (length(content) between 100 and 50000),
  cover_image text generated always as ('/images/articles/' || lower(category) || '.svg') stored,
  -- ceil(words / 200); the backend's InMemory adapter mirrors this (articles/domain.py reading_minutes).
  reading_minutes integer generated always as
    (greatest(1, ceil(cardinality(regexp_split_to_array(btrim(content), '\s+')) / 200.0)::int)) stored,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'PUBLISHED')),
  published_at timestamptz,
  views bigint not null default 0 check (views >= 0),
  author_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'PUBLISHED') = (published_at is not null))
);

create index articles_published_idx on public.articles (published_at desc, id) where status = 'PUBLISHED';
create index articles_category_published_idx on public.articles (category, published_at desc, id)
  where status = 'PUBLISHED';
create index articles_created_idx on public.articles (created_at desc, id);

alter table public.articles enable row level security;
revoke all on public.articles from anon, authenticated;
grant select on public.articles to anon, authenticated;
-- Two policies, not one OR: is_admin() is not executable by anon.
create policy articles_select_public on public.articles for select to anon, authenticated
  using (status = 'PUBLISHED');
create policy articles_select_admin on public.articles for select to authenticated
  using (public.is_admin());

alter table public.admin_audit_log
  drop constraint admin_audit_log_action_check,
  add constraint admin_audit_log_action_check check (action in (
    'USER_LOCKED', 'USER_UNLOCKED', 'POSTING_HIDDEN', 'POSTING_UNHIDDEN', 'COMPANY_VERIFIED', 'COMPANY_UNVERIFIED',
    'ARTICLE_PUBLISHED', 'ARTICLE_UNPUBLISHED')),
  drop constraint admin_audit_log_target_type_check,
  add constraint admin_audit_log_target_type_check check (target_type in ('USER', 'POSTING', 'COMPANY', 'ARTICLE'));

-- p_slug comes slugified from the backend; a taken slug gets -2, -3… (the unique index still guards races).
-- Errors carry the ArticleError code as message (backend/app/modules/articles/postgres.py).
create function public.admin_save_article(
  p_id uuid, p_title text, p_slug text, p_excerpt text, p_category text, p_content text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_base text := left(btrim(p_slug, '-'), 190);
  v_slug text := v_base;
  v_n int := 1;
begin
  perform public.admin_require();
  if length(btrim(p_title)) not between 5 and 200
     or length(btrim(p_excerpt)) not between 20 and 300
     or length(btrim(p_content)) not between 100 and 50000
     or p_category is null or p_category not in ('CV', 'INTERVIEW', 'SALARY', 'CAREER', 'WORKPLACE')
     or v_base is null or v_base !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(v_base) < 3 then
    raise exception 'INVALID_ARTICLE';
  end if;
  while exists (select 1 from public.articles where slug = v_slug and id is distinct from p_id) loop
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  end loop;

  if p_id is null then
    insert into public.articles (slug, title, excerpt, category, content, author_id)
    values (v_slug, btrim(p_title), btrim(p_excerpt), p_category, btrim(p_content), auth.uid())
    returning id into v_id;
  else
    update public.articles
    set slug = v_slug, title = btrim(p_title), excerpt = btrim(p_excerpt), category = p_category,
        content = btrim(p_content), updated_at = now()
    where id = p_id
    returning id into v_id;
    if v_id is null then
      raise exception 'ARTICLE_NOT_FOUND';
    end if;
  end if;
  return v_id;
end;
$$;

-- Publishing keeps the first published_at only while published; republishing after a takedown dates it anew.
create function public.admin_set_article_published(p_id uuid, p_published boolean) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_article public.articles;
begin
  perform public.admin_require();
  update public.articles
  set status = case when p_published then 'PUBLISHED' else 'DRAFT' end,
      published_at = case when p_published then coalesce(published_at, now()) end,
      updated_at = now()
  where id = p_id
  returning * into v_article;
  if not found then
    raise exception 'ARTICLE_NOT_FOUND';
  end if;
  perform public.admin_audit(
    case when p_published then 'ARTICLE_PUBLISHED' else 'ARTICLE_UNPUBLISHED' end,
    'ARTICLE', v_article.id, v_article.title, jsonb_build_object('slug', v_article.slug));
end;
$$;

create function public.increment_article_views(p_slug text) returns void
language sql
security definer
set search_path = ''
as $$
  update public.articles set views = views + 1 where slug = p_slug and status = 'PUBLISHED';
$$;

revoke execute on function public.admin_save_article(uuid, text, text, text, text, text) from public, anon;
revoke execute on function public.admin_set_article_published(uuid, boolean) from public, anon;
revoke execute on function public.increment_article_views(text) from public;
grant execute on function public.admin_save_article(uuid, text, text, text, text, text) to authenticated;
grant execute on function public.admin_set_article_published(uuid, boolean) to authenticated;
grant execute on function public.increment_article_views(text) to anon, authenticated;
