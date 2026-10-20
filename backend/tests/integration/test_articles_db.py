"""Ticket 46 on the real DB: RLS on articles, admin-only RPCs, slug suffixes, audit, view counter.

Each test runs in its own transaction, always rolled back. Run: RUN_INTEGRATION=1 uv run pytest -m integration
"""

import os
from contextlib import contextmanager

import psycopg
import pytest
from psycopg import errors

from app.modules.articles.domain import ArticleError
from app.modules.articles.postgres import PostgresArticleRepository
from app.modules.articles.service import ArticleService
from tests.integration.conftest import apply_articles_migration
from tests.integration.test_admin_rpc import _as, _refused, _signup

DATABASE_URL = os.environ.get("INTEGRATION_DATABASE_URL")
pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(not DATABASE_URL, reason="needs RUN_INTEGRATION=1 and DATABASE_URL"),
]

BODY = "Nội dung kiểm thử tích hợp cho bài cẩm nang. " * 50  # 450 words → 3 minutes
SAVE = "select public.admin_save_article(%s, %s, %s, %s, %s, %s)"


@pytest.fixture
def db():
    with psycopg.connect(DATABASE_URL) as conn, conn.transaction(force_rollback=True):
        apply_articles_migration(conn)
        admin = _signup(conn, {"role": "CANDIDATE", "full_name": "Quản Trị Cẩm Nang"})
        conn.execute("update public.profiles set role = 'ADMIN' where id = %s", (admin,))
        employer = _signup(conn, {"role": "EMPLOYER", "company_name": "Cty Cẩm Nang"})
        candidate = _signup(conn, {"role": "CANDIDATE", "full_name": "Ứng Viên Cẩm Nang"})
        yield {"conn": conn, "admin": admin, "employer": employer, "candidate": candidate}


def _service(db, monkeypatch, user_id):
    conn = db["conn"]

    @contextmanager
    def tx(claims, pool=None):
        with _as(conn, user_id):
            yield conn

    monkeypatch.setattr("app.modules.articles.postgres.user_tx", tx)
    return ArticleService(PostgresArticleRepository({"sub": str(user_id)} if user_id else None))


def _save(service, title, slug=None, category="CV"):
    return service.save(None, title, slug, "Tóm tắt bài kiểm thử tích hợp", category, BODY)


def test_admin_flow_slug_suffix_generated_columns_audit_and_views(db, monkeypatch):
    admin = _service(db, monkeypatch, db["admin"])
    first = _save(admin, "Kiểm thử Cẩm nang Tích hợp")
    second = _save(admin, "Kiểm thử cẩm nang tích hợp!")
    assert (first["slug"], second["slug"]) == ("kiem-thu-cam-nang-tich-hop", "kiem-thu-cam-nang-tich-hop-2")
    assert first["coverImage"] == "/images/articles/cv.svg" and first["readingMinutes"] == 3
    edited = admin.save(first["id"], "Kiểm thử đổi danh mục", first["slug"], "Tóm tắt bài kiểm thử tích hợp",
                        "SALARY", BODY)
    assert edited["slug"] == first["slug"] and edited["coverImage"] == "/images/articles/salary.svg"
    (author,) = db["conn"].execute("select author_id from public.articles where id = %s", (first["id"],)).fetchone()
    assert author == db["admin"]

    admin.set_published(first["id"], True)
    assert admin.get_admin(first["id"])["status"] == "PUBLISHED"
    admin.set_published(first["id"], False)
    admin.set_published(first["id"], True)
    actions = db["conn"].execute(
        "select action, target_type from public.admin_audit_log where target_id = %s order by seq",
        (first["id"],)).fetchall()
    assert actions == [("ARTICLE_PUBLISHED", "ARTICLE"), ("ARTICLE_UNPUBLISHED", "ARTICLE"),
                       ("ARTICLE_PUBLISHED", "ARTICLE")]

    anon = _service(db, monkeypatch, None)
    article = anon.get_published(first["slug"])
    assert article["views"] == 1 and article["content"] == BODY.strip() and "status" not in article
    assert anon.get_published(second["slug"]) is None  # still a draft
    assert anon.get_published(first["slug"])["views"] == 2
    assert first["id"] in [a["id"] for a in anon.list_published("SALARY", "doi danh muc", 1)["items"]]
    assert anon.list_published("CV", "kiem thu cam nang tich hop", 1)["total"] == 0  # draft hidden
    assert anon.list_admin(None, 1)["total"] == anon.list_published(None, None, 1)["total"]  # RLS: public only

    admin = _service(db, monkeypatch, db["admin"])  # user_tx is patched per service: switch back to the admin
    with pytest.raises(ArticleError) as err:
        admin.set_published("00000000-0000-0000-0000-000000000000", True)
    assert err.value.code == "ARTICLE_NOT_FOUND"


@pytest.mark.parametrize("role", ["candidate", "employer"])
def test_non_admins_are_refused_and_see_no_drafts(db, monkeypatch, role):
    admin = _service(db, monkeypatch, db["admin"])
    draft = _save(admin, "Bản nháp bí mật của quản trị")
    other = _service(db, monkeypatch, db[role])
    for call in (lambda: _save(other, "Bài viết trái phép"), lambda: other.set_published(draft["id"], True)):
        with pytest.raises(ArticleError) as err:
            call()
        assert err.value.code == "NOT_ADMIN"
    assert other.get_admin(draft["id"]) is None
    _refused(db["conn"], db[role], "update public.articles set views = 99 where id = %s", (draft["id"],),
             errors.InsufficientPrivilege)


def test_anon_cannot_call_admin_rpcs_or_write_the_table(db):
    conn = db["conn"]
    _refused(conn, None, SAVE, (None, "Tiêu đề hợp lệ", "slug-hop-le", "Tóm tắt đủ hai mươi ký tự", "CV", BODY),
             errors.InsufficientPrivilege)
    _refused(conn, None, "insert into public.articles (slug, title, excerpt, category, content) "
             "values ('a-b-c', 'Tiêu đề', 'Tóm tắt đủ hai mươi ký tự', 'CV', %s)", (BODY,), errors.InsufficientPrivilege)


@pytest.mark.parametrize("params", [
    (None, "abcd", "slug-ok", "Tóm tắt đủ hai mươi ký tự", "CV", BODY),
    (None, "Tiêu đề hợp lệ", "slug-ok", "Tóm tắt đủ hai mươi ký tự", "OTHER", BODY),
    (None, "Tiêu đề hợp lệ", "Có Dấu", "Tóm tắt đủ hai mươi ký tự", "CV", BODY),
    (None, "Tiêu đề hợp lệ", "ab", "Tóm tắt đủ hai mươi ký tự", "CV", BODY),
    (None, "Tiêu đề hợp lệ", "slug-ok", "Tóm tắt đủ hai mươi ký tự", "CV", "ngắn"),
])
def test_rpc_validates_even_when_called_directly(db, params):
    assert _refused(db["conn"], db["admin"], SAVE, params) == "INVALID_ARTICLE"


def test_table_constraints(db):
    conn = db["conn"]
    with pytest.raises(errors.CheckViolation), conn.transaction():
        conn.execute("insert into public.articles (slug, title, excerpt, category, content, status) "
                     "values ('a-b-c', 'Tiêu đề', 'Tóm tắt đủ hai mươi ký tự', 'CV', %s, 'PUBLISHED')", (BODY,))
