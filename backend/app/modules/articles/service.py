from app.modules.articles.domain import (
    CATEGORIES,
    CONTENT_LEN,
    EXCERPT_LEN,
    PAGE_SIZE,
    RELATED_LIMIT,
    TITLE_LEN,
    ArticleError,
    page_json,
    slugify,
)
from app.modules.articles.repository import ArticleRepository, Row


def _page(page: int) -> int:
    return min(max(page, 1), 1000)


class ArticleService:
    def __init__(self, repo: ArticleRepository):
        self.repo = repo

    def list_published(self, category: str | None, q: str | None, page: int) -> dict:
        page = _page(page)
        q = (q or "").strip()[:100] or None
        rows, total = self.repo.list_published(category if category in CATEGORIES else None, q,
                                               (page - 1) * PAGE_SIZE, PAGE_SIZE)
        return page_json(rows, total, page)

    def get_published(self, slug: str) -> Row | None:
        """Counts a view; `related` = up to 3 newest published articles of the same category."""
        article = self.repo.get_published(slug)
        if article is None:
            return None
        self.repo.increment_views(slug)
        article["views"] += 1
        article["related"] = self.repo.related(article["id"], article["category"], RELATED_LIMIT)
        return article

    def list_admin(self, status: str | None, page: int) -> dict:
        page = _page(page)
        rows, total = self.repo.list_admin(status if status in ("DRAFT", "PUBLISHED") else None,
                                           (page - 1) * PAGE_SIZE, PAGE_SIZE)
        return page_json(rows, total, page)

    def get_admin(self, article_id: str) -> Row | None:
        return self.repo.get_admin(article_id)

    def save(self, article_id: str | None, title: str, slug: str | None, excerpt: str, category: str,
             content: str) -> Row:
        """Slug: given or derived from the title, folded to a-z0-9-; the repository makes it unique."""
        title, excerpt, content = title.strip(), excerpt.strip(), content.strip()
        if not (TITLE_LEN[0] <= len(title) <= TITLE_LEN[1] and EXCERPT_LEN[0] <= len(excerpt) <= EXCERPT_LEN[1]
                and CONTENT_LEN[0] <= len(content) <= CONTENT_LEN[1]):
            raise ArticleError("INVALID_LENGTH")
        if category not in CATEGORIES:
            raise ArticleError("INVALID_ARTICLE")
        clean_slug = slugify(slug or "") or slugify(title)
        if len(clean_slug) < 3:
            raise ArticleError("INVALID_SLUG")
        saved = self.repo.get_admin(self.repo.save(article_id, title, clean_slug, excerpt, category, content))
        if saved is None:
            raise ArticleError("ARTICLE_NOT_FOUND")
        del saved["status"]
        return saved

    def set_published(self, article_id: str, published: bool) -> None:
        self.repo.set_published(article_id, published)
