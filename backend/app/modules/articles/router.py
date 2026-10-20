from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, ConfigDict

from app.auth import AdminActor, OptionalUser
from app.modules.articles.domain import ArticleCategory, ArticleError, ArticleStatus
from app.modules.articles.postgres import PostgresArticleRepository
from app.modules.articles.service import ArticleService

router = APIRouter(tags=["articles"])

Page = Annotated[int, Query(ge=1, le=1000)]


class SaveBody(BaseModel):
    """Lengths are checked after trimming in the service (one Vietnamese message)."""

    model_config = ConfigDict(extra="forbid")
    title: str
    slug: str | None = None
    excerpt: str
    category: ArticleCategory
    content: str


class PublishedBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    published: bool


def get_public_service(actor: OptionalUser) -> ArticleService:
    return ArticleService(PostgresArticleRepository(actor.claims if actor else None))


def get_admin_service(actor: AdminActor) -> ArticleService:
    return ArticleService(PostgresArticleRepository(actor.claims))


PublicService = Annotated[ArticleService, Depends(get_public_service)]
AdminService = Annotated[ArticleService, Depends(get_admin_service)]


@router.get("/articles")
def list_articles(service: PublicService, category: ArticleCategory | None = None, q: str | None = None,
                  page: Page = 1):
    return service.list_published(category, q, page)


@router.get("/articles/{slug}")
def get_article(slug: str, service: PublicService):
    article = service.get_published(slug)
    if article is None:
        raise ArticleError("ARTICLE_NOT_FOUND")
    return article


@router.get("/admin/articles")
def list_admin_articles(service: AdminService, status: ArticleStatus | None = None, page: Page = 1):
    return service.list_admin(status, page)


@router.get("/admin/articles/{article_id}")
def get_admin_article(article_id: UUID, service: AdminService):
    article = service.get_admin(str(article_id))
    if article is None:
        raise ArticleError("ARTICLE_NOT_FOUND")
    return article


@router.post("/admin/articles", status_code=201)
def create_article(body: SaveBody, service: AdminService):
    return service.save(None, body.title, body.slug, body.excerpt, body.category, body.content)


@router.put("/admin/articles/{article_id}")
def update_article(article_id: UUID, body: SaveBody, service: AdminService):
    return service.save(str(article_id), body.title, body.slug, body.excerpt, body.category, body.content)


@router.post("/admin/articles/{article_id}/published")
def set_article_published(article_id: UUID, body: PublishedBody, service: AdminService) -> None:
    service.set_published(str(article_id), body.published)
