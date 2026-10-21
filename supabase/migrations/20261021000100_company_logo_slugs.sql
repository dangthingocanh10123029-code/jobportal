-- Ticket 57: each demo company gets its own static logo (/images/companies/<slug>.svg) instead of the shared logo-NN set.
-- Still only a same-origin static file or the company's own storage object; no arbitrary URLs.
alter table public.companies drop constraint companies_check;
alter table public.companies add constraint companies_check check (
  logo_url is null
  or logo_url ~ ('^https?://[^/]+/storage/v1/object/public/company-logos/' || id::text || '/[^/]+$')
  or logo_url ~ '^/images/companies/[a-z0-9]+(-[a-z0-9]+)*\.svg$'
);
