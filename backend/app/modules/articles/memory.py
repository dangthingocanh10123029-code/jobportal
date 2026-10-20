from dataclasses import dataclass, field
from datetime import UTC, datetime
from uuid import uuid4

from app.modules.articles.domain import ArticleError, cover_image, reading_minutes
from app.modules.articles.repository import Row
from app.modules.postings.domain import fold_accents

SUMMARY = ("id", "slug", "title", "excerpt", "category", "coverImage", "readingMinutes", "publishedAt", "views")


def _summary(a: Row) -> Row:
    return {k: a[k] for k in SUMMARY}


@dataclass
class InMemoryArticleRepository:
    is_admin: bool = True
    articles: dict[str, Row] = field(default_factory=dict)
    audit: list[Row] = field(default_factory=list)

    def _published(self) -> list[Row]:
        rows = [a for a in self.articles.values() if a["status"] == "PUBLISHED"]
        return sorted(rows, key=lambda a: (a["publishedAt"], a["id"]), reverse=True)

    def _require_admin(self) -> None:
        if not self.is_admin:
            raise ArticleError("NOT_ADMIN")

    def list_published(self, category, q, offset, limit):
        rows = [a for a in self._published() if category in (None, a["category"])
                and (q is None or fold_accents(q) in fold_accents(f"{a['title']} {a['excerpt']}"))]
        return [_summary(a) for a in rows[offset:offset + limit]], len(rows)

    def get_published(self, slug):
        a = next((a for a in self._published() if a["slug"] == slug), None)
        return {**_summary(a), "content": a["content"]} if a else None

    def related(self, article_id, category, limit):
        return [_summary(a) for a in self._published() if a["category"] == category and a["id"] != article_id][:limit]

    def increment_views(self, slug):
        for a in self._published():
            if a["slug"] == slug:
                a["views"] += 1

    def list_admin(self, status, offset, limit):
        if not self.is_admin:
            return [], 0
        rows = sorted((a for a in self.articles.values() if status in (None, a["status"])),
                      key=lambda a: (a["createdAt"], a["id"]), reverse=True)
        return [{**_summary(a), "status": a["status"]} for a in rows[offset:offset + limit]], len(rows)

    def get_admin(self, article_id):
        a = self.articles.get(article_id) if self.is_admin else None
        return {**_summary(a), "content": a["content"], "status": a["status"]} if a else None

    def save(self, article_id, title, slug, excerpt, category, content):
        self._require_admin()
        if article_id is not None and article_id not in self.articles:
            raise ArticleError("ARTICLE_NOT_FOUND")
        taken = {a["slug"] for a in self.articles.values() if a["id"] != article_id}
        unique, n = slug, 1
        while unique in taken:
            n += 1
            unique = f"{slug}-{n}"
        article = self.articles.get(article_id) or {
            "id": str(uuid4()), "status": "DRAFT", "publishedAt": None, "views": 0,
            "createdAt": datetime.now(UTC).isoformat()}
        article.update(slug=unique, title=title, excerpt=excerpt, category=category, content=content,
                       coverImage=cover_image(category), readingMinutes=reading_minutes(content))
        self.articles[article["id"]] = article
        return article["id"]

    def set_published(self, article_id, published):
        self._require_admin()
        a = self.articles.get(article_id)
        if a is None:
            raise ArticleError("ARTICLE_NOT_FOUND")
        a["status"] = "PUBLISHED" if published else "DRAFT"
        a["publishedAt"] = (a["publishedAt"] or datetime.now(UTC).isoformat()) if published else None
        self.audit.append({"action": "ARTICLE_PUBLISHED" if published else "ARTICLE_UNPUBLISHED", "targetId": a["id"]})
