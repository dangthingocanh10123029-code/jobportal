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


def apply_interviews_migration(conn) -> None:
    """Until the Coordinator pushes ticket 40, run its migration inside the (rolled-back) test transaction."""
    if conn.execute("select to_regclass('public.interviews') is null").fetchone()[0]:
        conn.execute((MIGRATIONS / "20261020000100_interviews.sql").read_text())


def apply_articles_migration(conn) -> None:
    """Until the Coordinator pushes ticket 46, run its migration inside the (rolled-back) test transaction."""
    apply_admin_migration(conn)
    if conn.execute("select to_regclass('public.articles') is null").fetchone()[0]:
        conn.execute((MIGRATIONS / "20261020000700_articles.sql").read_text())


def apply_messages_migration(conn) -> None:
    """Until the Coordinator pushes ticket 41, run its migration inside the (rolled-back) test transaction."""
    if conn.execute("select to_regclass('public.messages') is null").fetchone()[0]:
        conn.execute((MIGRATIONS / "20261020000200_messages.sql").read_text())


def apply_online_cv_migration(conn) -> None:
    """Until the Coordinator pushes ticket 42, run its migration inside the (rolled-back) test transaction."""
    if conn.execute("select to_regclass('public.candidate_cvs') is null").fetchone()[0]:
        conn.execute((MIGRATIONS / "20261020000300_online_cv.sql").read_text())


def apply_reviews_migration(conn) -> None:
    """Until the Coordinator pushes ticket 45, run its migration inside the (rolled-back) test transaction."""
    apply_admin_migration(conn)
    if conn.execute("select to_regclass('public.company_reviews') is null").fetchone()[0]:
        conn.execute((MIGRATIONS / "20261020000750_company_reviews.sql").read_text())


def apply_talent_migration(conn) -> None:
    """Until the Coordinator pushes ticket 43, run its migration inside the (rolled-back) test transaction."""
    apply_online_cv_migration(conn)
    if conn.execute("select to_regclass('public.talent_profiles') is null").fetchone()[0]:
        conn.execute((MIGRATIONS / "20261020000400_talent.sql").read_text())


def apply_alerts_migration(conn) -> None:
    """Until the Coordinator pushes ticket 44, run its migration inside the (rolled-back) test transaction."""
    apply_talent_migration(conn)  # profiles.location (43)
    if conn.execute("select to_regclass('public.job_alerts') is null").fetchone()[0]:
        conn.execute((MIGRATIONS / "20261020000500_job_alerts.sql").read_text())
