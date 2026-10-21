import Link from 'next/link';
import type { ArticleSummary } from '@/actions/types';
import { ArticleCover } from './article-cover';
import { articleCategoryLabels, formatArticleDate } from './labels';

export function ArticleCard({ article, headingLevel = 2 }: { article: ArticleSummary; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 3 ? 'h3' : 'h2';
  return (
    <article className="surface-card article-card">
      <ArticleCover slug={article.slug} src={article.coverImage} />
      <div className="article-card-body">
        <span className="article-category">{articleCategoryLabels[article.category]}</span>
        <Heading><Link className="article-card-link" href={`/guide/${article.slug}`}>{article.title}</Link></Heading>
        <p>{article.excerpt}</p>
        <div className="article-meta"><span>{formatArticleDate(article.publishedAt)}</span><span>{article.readingMinutes} phút đọc</span></div>
      </div>
    </article>
  );
}
