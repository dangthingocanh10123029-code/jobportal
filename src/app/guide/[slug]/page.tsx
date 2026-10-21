import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getArticle } from '@/actions/articles';
import { ArticleCard } from '@/components/articles/article-card';
import { ArticleCover } from '@/components/articles/article-cover';
import { ArticleMarkdown } from '@/components/articles/article-markdown';
import { articleCategoryLabels, formatArticleDate } from '@/components/articles/labels';
import { parseArticleMarkdown, tableOfContents } from '@/components/articles/markdown';
import { ArrowLeft } from 'lucide-react';
import { icon } from '@/components/ui/primitives';

export default async function GuideArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const article = await getArticle((await params).slug);
  if (!article) notFound();
  const blocks = parseArticleMarkdown(article.content);
  const toc = tableOfContents(blocks);

  return (
    <main className="page-shell guide-article-page">
      <Link className="back-link" href="/guide"><ArrowLeft {...icon} />Cẩm nang nghề nghiệp</Link>
      <article className="guide-article">
        <header className="guide-article-header">
          <Link className="article-category" href={`/guide?category=${article.category}`}>{articleCategoryLabels[article.category]}</Link>
          <h1>{article.title}</h1>
          <p className="guide-article-excerpt">{article.excerpt}</p>
          <div className="article-meta">
            <span>{formatArticleDate(article.publishedAt)}</span>
            <span>{article.readingMinutes} phút đọc</span>
            <span>{article.views.toLocaleString('vi-VN')} lượt xem</span>
          </div>
        </header>
        <ArticleCover className="guide-article-cover" priority slug={article.slug} src={article.coverImage} />
        <div className="guide-article-layout">
          {toc.length ? (
            <nav aria-label="Mục lục" className="surface-card guide-toc">
              <h2>Mục lục</h2>
              <ol>{toc.map((item) => <li key={item.id}><a href={`#${item.id}`}>{item.title}</a></li>)}</ol>
            </nav>
          ) : null}
          <ArticleMarkdown blocks={blocks} />
        </div>
      </article>
      {article.related.length ? (
        <section aria-labelledby="related-heading" className="guide-related">
          <h2 id="related-heading">Bài viết cùng chủ đề</h2>
          <div className="article-grid">{article.related.map((item) => <ArticleCard article={item} key={item.id} />)}</div>
        </section>
      ) : null}
    </main>
  );
}
