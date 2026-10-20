import pytest
from fastapi.testclient import TestClient

from app.auth import Actor, optional_user
from app.main import app
from app.modules.articles import router as articles_router
from app.modules.articles.domain import ArticleError, reading_minutes, slugify
from app.modules.articles.memory import InMemoryArticleRepository
from app.modules.articles.service import ArticleService

ADMIN = "00000000-0000-0000-0000-00000000000a"
BODY = "Nội dung bài viết đủ dài. " * 10


@pytest.fixture
def repo():
    return InMemoryArticleRepository()


def save(service, title="Viết CV ấn tượng", **kw):
    args = {"article_id": None, "slug": None, "excerpt": "Tóm tắt đủ hai mươi ký tự", "category": "CV",
            "content": BODY, **kw}
    return service.save(title=title, **args)


def test_slugify_folds_vietnamese_and_keeps_room_for_suffix():
    assert slugify("  Đàm phán LƯƠNG: 10 mẹo!  ") == "dam-phan-luong-10-meo"
    assert slugify("!!!") == ""
    assert len(slugify("a" * 300)) == 190


def test_reading_minutes_is_ceil_words_over_200():
    assert [reading_minutes(w) for w in ("x", "x " * 200, "x " * 201, "")] == [1, 1, 2, 1]


def test_save_derives_unique_slug_trims_and_fills_derived_fields(repo):
    service = ArticleService(repo)
    first = save(service, title="  Viết CV ấn tượng  ")
    assert first["slug"] == "viet-cv-an-tuong" and first["title"] == "Viết CV ấn tượng"
    assert first["coverImage"] == "/images/articles/cv.svg" and first["readingMinutes"] == 1
    assert "status" not in first and first["publishedAt"] is None
    assert [save(service)["slug"] for _ in range(2)] == ["viet-cv-an-tuong-2", "viet-cv-an-tuong-3"]
    assert save(service, slug="Tự Đặt Slug")["slug"] == "tu-dat-slug"
    # Re-saving keeps its own slug instead of bumping it.
    again = save(service, article_id=first["id"], slug=first["slug"], category="SALARY")
    assert again["slug"] == "viet-cv-an-tuong" and again["coverImage"] == "/images/articles/salary.svg"


@pytest.mark.parametrize("kw, code", [
    ({"title": "abcd "}, "INVALID_LENGTH"),
    ({"excerpt": "ngắn"}, "INVALID_LENGTH"),
    ({"content": "x" * 99}, "INVALID_LENGTH"),
    ({"content": "x" * 50001}, "INVALID_LENGTH"),
    ({"category": "OTHER"}, "INVALID_ARTICLE"),
    ({"title": "!!! ??? ...", "slug": None}, "INVALID_SLUG"),
    ({"article_id": "missing"}, "ARTICLE_NOT_FOUND"),
])
def test_save_refusals(repo, kw, code):
    with pytest.raises(ArticleError) as err:
        save(ArticleService(repo), **kw)
    assert err.value.code == code


def test_only_published_is_public_with_views_related_and_audit(repo):
    service = ArticleService(repo)
    ids = [save(service, title=f"Bài CV số {i}")["id"] for i in range(5)]
    salary = save(service, title="Lương thưởng", category="SALARY")["id"]
    for article_id in [*ids[:4], salary]:
        service.set_published(article_id, True)
    assert service.get_published("bai-cv-so-4") is None  # draft

    article = service.get_published("bai-cv-so-0")
    assert article["views"] == 1 and article["content"] == BODY.strip()
    assert len(article["related"]) == 3 and {r["category"] for r in article["related"]} == {"CV"}
    assert ids[0] not in [r["id"] for r in article["related"]]
    assert service.get_published("bai-cv-so-0")["views"] == 2

    service.set_published(ids[0], False)
    assert service.get_published("bai-cv-so-0") is None
    assert [a["action"] for a in repo.audit][-1] == "ARTICLE_UNPUBLISHED"

    page = service.list_published("CV", None, 1)
    assert (page["total"], page["pageSize"]) == (3, 12)
    assert service.list_published(None, "LUONG", 1)["items"][0]["id"] == salary
    assert service.list_published("NOPE", "  ", 0)["total"] == 4
    assert service.list_published(None, None, 2)["items"] == []
    assert service.list_admin("DRAFT", 1)["total"] == 2 and service.list_admin(None, 1)["total"] == 6


def test_non_admin_cannot_write_or_read_drafts():
    repo = InMemoryArticleRepository(is_admin=False)
    service = ArticleService(repo)
    with pytest.raises(ArticleError) as err:
        save(service)
    assert err.value.code == "NOT_ADMIN"
    assert service.list_admin(None, 1)["total"] == 0


def test_routes(repo, monkeypatch):
    monkeypatch.setattr(articles_router, "PostgresArticleRepository", lambda claims: repo)
    client = TestClient(app)
    try:
        app.dependency_overrides[optional_user] = lambda: Actor(ADMIN, "ADMIN", {"sub": ADMIN}, "t")
        body = {"title": "Phỏng vấn online", "excerpt": "Tóm tắt đủ hai mươi ký tự", "category": "INTERVIEW",
                "content": BODY}
        res = client.post("/admin/articles", json=body)
        assert res.status_code == 201 and res.json()["slug"] == "phong-van-online"
        article_id = res.json()["id"]
        assert client.post("/admin/articles", json={**body, "id": article_id}).status_code == 422
        res = client.put(f"/admin/articles/{article_id}", json={**body, "slug": "pv-online"})
        assert res.json()["slug"] == "pv-online"
        assert client.post(f"/admin/articles/{article_id}/published", json={"published": True}).json() is None
        assert client.get(f"/admin/articles/{article_id}").json()["status"] == "PUBLISHED"
        assert client.get("/admin/articles?status=NOPE").status_code == 422
        assert client.post("/admin/articles", json={**body, "content": "ngắn"}).json() == {
            "error": "Tiêu đề 5–200, tóm tắt 20–300, nội dung 100–50.000 ký tự"}
        missing = "00000000-0000-0000-0000-0000000000ff"
        assert client.get(f"/admin/articles/{missing}").status_code == 404
        assert client.put(f"/admin/articles/{missing}", json=body).status_code == 404
    finally:
        app.dependency_overrides.clear()

    assert client.get("/articles?category=INTERVIEW").json()["total"] == 1
    assert client.get("/articles/pv-online").json()["views"] == 1
    assert client.get("/articles/nope").status_code == 404
    assert client.get("/admin/articles").status_code == 401
    app.dependency_overrides[optional_user] = lambda: Actor(ADMIN, "EMPLOYER", {"sub": ADMIN}, "t")
    try:
        assert client.post("/admin/articles", json=body).status_code == 403
    finally:
        app.dependency_overrides.clear()
