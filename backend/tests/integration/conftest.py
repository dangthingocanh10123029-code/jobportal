from pathlib import Path

MIGRATIONS = Path(__file__).resolve().parents[3] / "supabase" / "migrations"


def apply_admin_migration(conn) -> None:
    """Until the Coordinator pushes tickets 32/35, run their migrations inside the (rolled-back) test transaction."""
    if conn.execute("select to_regprocedure('public.is_admin()') is null").fetchone()[0]:
        conn.execute((MIGRATIONS / "20261017000500_admin.sql").read_text())
    seq_missing = "select not exists (select 1 from information_schema.columns " \
        "where table_name = 'admin_audit_log' and column_name = 'seq')"
    if conn.execute(seq_missing).fetchone()[0]:
        conn.execute((MIGRATIONS / "20261017000600_audit_order.sql").read_text())
