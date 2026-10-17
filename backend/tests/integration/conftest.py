from pathlib import Path

MIGRATIONS = Path(__file__).resolve().parents[3] / "supabase" / "migrations"


def apply_admin_migration(conn) -> None:
    """Until the Coordinator pushes ticket 32, run its migration inside the (rolled-back) test transaction."""
    if conn.execute("select to_regprocedure('public.is_admin()') is null").fetchone()[0]:
        conn.execute((MIGRATIONS / "20261017000500_admin.sql").read_text())
