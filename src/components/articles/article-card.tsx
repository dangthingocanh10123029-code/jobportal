import Link from 'next/link';
import type { ArticleSummary } from '@/actions/types';
import { ArticleCover } from './article-cover';
import { articleCategoryLabels, formatArticleDate } from './labels';

export function ArticleCard({ article }: { article: ArticleSummary }) {
  return (
    <article className="surface-card article-card">
      <ArticleCover src={article.coverImage} />
      <div className="article-card-body">
        <span className="article-category">{articleCategoryLabels[article.category]}</span>
        <h2><Link className="article-card-link" href={`/guide/${article.slug}`}>{article.title}</Link></h2>
        <p>{article.excerpt}</p>
        <div className="article-meta"><span>{formatArticleDate(article.publishedAt)}</span><span>{article.readingMinutes} phút đọc</span></div>
      </div>
    </article>
  );
}
