-- Ticket 35: entries written in one transaction shared created_at = now(), so the audit list order was random.
-- clock_timestamp() differs per row, and seq (strictly increasing) breaks any remaining tie.
alter table public.admin_audit_log
  alter column created_at set default clock_timestamp(),
  add column seq bigint generated always as identity;

drop index public.admin_audit_log_created_idx;
create index admin_audit_log_created_idx on public.admin_audit_log (created_at desc, seq desc);

create or replace view public.admin_audit_entries with (security_barrier = true) as
  select id, actor_id, actor_email, action, target_type, target_id, target_label, details, created_at, seq
  from public.admin_audit_log
  where public.is_admin();
