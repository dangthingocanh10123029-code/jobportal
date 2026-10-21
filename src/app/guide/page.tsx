import Link from 'next/link';
import type { CSSProperties } from 'react';
import { listArticles } from '@/actions/articles';
import { ARTICLE_CATEGORIES, articleFilterSchema } from '@/actions/articles-schema';
import { ArticleCard } from '@/components/articles/article-card';
import { articleCategoryLabels } from '@/components/articles/labels';

export const metadata = { title: 'Cẩm nang nghề nghiệp — Job Portal' };

type GuideSearchParams = Record<string, string | string[] | undefined>;

export default async function GuidePage({ searchParams }: { searchParams: Promise<GuideSearchParams> }) {
  const raw = await searchParams;
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  const filter = articleFilterSchema.parse({ category: first(raw.category), q: first(raw.q), page: first(raw.page) });
  const result = await listArticles(filter);
  const pageCount = Math.max(1, Math.ceil(result.total / result.pageSize));

  function href(changes: { category?: string; page?: number }) {
    const next = { category: filter.category, q: filter.q, page: 1, ...changes };
    const query = new URLSearchParams();
    if (next.category) query.set('category', next.category);
    if (next.q) query.set('q', next.q);
    if (next.page > 1) query.set('page', String(next.page));
    const qs = query.toString();
    return qs ? `/guide?${qs}` : '/guide';
  }

  return (
    <main className="page-shell guide-page">
      <section className="guide-hero" style={{ '--guide-hero-image': `url(/images/guide/hero-${(filter.category ?? 'all').toLowerCase()}.webp)` } as CSSProperties}>
        <span className="eyebrow">{filter.category ? `Cẩm nang · ${articleCategoryLabels[filter.category]}` : 'Cẩm nang nghề nghiệp'}</span>
        <h1>Kinh nghiệm cho từng bước trên hành trình sự nghiệp</h1>
        <p>Bài viết thực tế về CV, phỏng vấn, lương thưởng, phát triển bản thân và môi trường làm việc.</p>
        <form action="/guide" className="guide-search" method="get" role="search">
          {filter.category ? <input name="category" type="hidden" value={filter.category} /> : null}
          <label className="visually-hidden" htmlFor="guide-q">Tìm bài viết</label>
          <input className="text-input" defaultValue={filter.q ?? ''} id="guide-q" maxLength={100} name="q" placeholder="Ví dụ: thư xin việc, deal lương…" type="search" />
          <button className="button button-primary" type="submit">Tìm bài viết</button>
        </form>
      </section>

      <nav aria-label="Chủ đề cẩm nang" className="guide-categories">
        <Link aria-current={filter.category ? undefined : 'page'} className={`industry-chip${filter.category ? '' : ' selected'}`} href={href({ category: undefined })}>Tất cả</Link>
        {ARTICLE_CATEGORIES.map((category) => (
          <Link aria-current={filter.category === category ? 'page' : undefined} className={`industry-chip${filter.category === category ? ' selected' : ''}`} href={href({ category })} key={category}>
            {articleCategoryLabels[category]}
          </Link>
        ))}
      </nav>

      <div className="companies-results-heading">
        <h2>{filter.q ? `Kết quả cho “${filter.q}”` : filter.category ? articleCategoryLabels[filter.category] : 'Bài viết mới nhất'}</h2>
        <span aria-live="polite">{result.total} bài viết</span>
      </div>

      {result.items.length ? (
        <div className="article-grid">{result.items.map((article) => <ArticleCard article={article} key={article.id} />)}</div>
      ) : (
        <section className="surface-card companies-empty-state">
          <img alt="" height="180" src="/images/empty-search.svg" width="240" />
          <h2>Chưa có bài viết phù hợp</h2>
          <p>Thử chủ đề khác hoặc bỏ bớt từ khóa tìm kiếm.</p>
          <Link className="button button-quiet" href="/guide">Xem toàn bộ cẩm nang</Link>
        </section>
      )}

      {pageCount > 1 ? (
        <nav aria-label="Phân trang cẩm nang" className="pagination">
          {result.page > 1 ? <Link className="pagination-link" href={href({ page: result.page - 1 })}>← Trang trước</Link> : <span />}
          <span className="pagination-count">Trang {result.page} / {pageCount}</span>
          {result.page < pageCount ? <Link className="pagination-link" href={href({ page: result.page + 1 })}>Trang sau →</Link> : <span />}
        </nav>
      ) : null}
    </main>
  );
}
