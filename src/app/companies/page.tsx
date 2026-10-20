import Link from 'next/link';
import { listCompanies } from '@/actions/companies';
import { companySizeLabels } from '@/components/format';
import { Stars, formatRating } from '@/components/reviews/stars';
import { PageHeader } from '@/components/ui/primitives';

type CompanySearchParams = Record<string, string | string[] | undefined>;

export default async function CompaniesPage({ searchParams }: { searchParams: Promise<CompanySearchParams> }) {
  const params = await searchParams;
  const q = Array.isArray(params.q) ? params.q[0] : params.q;
  const rawPage = Array.isArray(params.page) ? params.page[0] : params.page;
  const parsedPage = Number(rawPage ?? 1);
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const result = await listCompanies({ q: q?.trim() || undefined, page });
  const pageCount = Math.max(1, Math.ceil(result.total / result.pageSize));

  function pageHref(nextPage: number) {
    const query = new URLSearchParams();
    if (q?.trim()) query.set('q', q.trim());
    query.set('page', String(nextPage));
    return `/companies?${query.toString()}`;
  }

  return (
    <main className="page-shell companies-page">
      <PageHeader className="companies-heading" description="Tìm hiểu các doanh nghiệp đang tìm kiếm đồng đội mới." eyebrow="Nhà tuyển dụng" title="Khám phá công ty" />
      <form action="/companies" className="companies-search-form" method="get">
        <label className="field-label" htmlFor="company-search">Tìm theo tên công ty<input autoComplete="organization" className="text-input" defaultValue={q ?? ''} id="company-search" name="q" placeholder="Ví dụ: công nghệ, giáo dục..." type="search" /></label>
        <button className="button button-primary" type="submit">Tìm công ty</button>
      </form>
      <div className="companies-results-heading"><h2>{q ? 'Kết quả tìm kiếm' : 'Tất cả công ty'}</h2><span>{result.total} công ty</span></div>
      {result.items.length ? (
        <div aria-label="Danh sách công ty" className="company-grid">
          {result.items.map((company) => (
            <Link className="surface-card company-list-card" href={`/companies/${company.id}`} key={company.id} prefetch={false}>
              <img alt="" className="company-list-logo" height="64" src={company.logoUrl ?? '/images/company-placeholder.svg'} width="64" />
              <span className="company-list-card-content">
                <strong>{company.name}{company.companyVerified ? <span aria-label="Công ty đã xác minh" className="verified-check"> ✓</span> : null}</strong>
                <span>{company.size ? companySizeLabels[company.size] : 'Quy mô chưa cập nhật'}</span>
                <span>{company.openPostings} tin đang tuyển</span>
                {company.rating !== null ? <span className="company-list-rating"><Stars size="sm" value={company.rating} /> {formatRating(company.rating)} · {company.reviewCount} đánh giá</span> : <span>Chưa có đánh giá</span>}
              </span>
              <span aria-hidden="true" className="company-list-arrow">→</span>
            </Link>
          ))}
        </div>
      ) : (
        <section className="surface-card companies-empty-state">
          <img alt="" height="180" src="/images/empty-search.svg" width="240" />
          <h2>{q ? 'Không tìm thấy công ty phù hợp' : 'Chưa có công ty nào'}</h2>
          <p>{q ? 'Thử một từ khóa khác để xem thêm doanh nghiệp.' : 'Danh sách công ty sẽ xuất hiện tại đây.'}</p>
        </section>
      )}
      {pageCount > 1 ? (
        <nav aria-label="Phân trang công ty" className="pagination">
          {result.page > 1 ? <Link className="pagination-link" href={pageHref(result.page - 1)}>← Trang trước</Link> : <span />}
          <span className="pagination-count">Trang {result.page} / {pageCount}</span>
          {result.page < pageCount ? <Link className="pagination-link" href={pageHref(result.page + 1)}>Trang sau →</Link> : <span />}
        </nav>
      ) : null}
    </main>
  );
}
