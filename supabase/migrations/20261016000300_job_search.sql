-- Ticket 04: accent-insensitive search over open postings.

create extension if not exists unaccent with schema extensions;

-- unaccent() is only STABLE (it looks its dictionary up by search_path); naming the dictionary
-- explicitly lets the wrapper be IMMUTABLE, so the planner can treat it like lower().
-- Mirrored by foldAccents() in src/modules/job-posting/domain/search.ts ("Kế toán" → "ke toan", "Đ" → "d").
create function public.f_unaccent(text) returns text
  language sql immutable strict parallel safe
  set search_path = ''
as $$ select lower(extensions.unaccent('extensions.unaccent'::regdictionary, $1)) $$;

-- Same rows and leading columns as ticket 03; adds the folded columns the Search Filter matches on.
-- The app folds the user's input with foldAccents() and compares with ILIKE.
create or replace view public.open_job_postings with (security_invoker = true) as
  select *,
    public.f_unaccent(title || ' ' || description) as search_text,
    public.f_unaccent(location) as search_location
  from public.job_postings_with_company
  where status = 'PUBLISHED' and application_deadline >= now();
