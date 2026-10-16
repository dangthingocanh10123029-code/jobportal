import Link from 'next/link';
import { z } from 'zod';
import { listOpenPostings } from '@/actions/postings';
import type { EmploymentType, PostingSummary, SearchFilter } from '@/actions/types';

const employmentTypes = ['FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'CONTRACT'] as const;

const employmentLabels: Record<EmploymentType, string> = {
  FULL_TIME: 'Toàn thời gian',
  PART_TIME: 'Bán thời gian',
  INTERNSHIP: 'Thực tập',
  CONTRACT: 'Hợp đồng',
};

function formatSalary(posting: PostingSummary) {
  if (posting.salaryMin === null && posting.salaryMax === null) return 'Thỏa thuận';
  const amount = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value)} ₫`;
  if (posting.salaryMin !== null && posting.salaryMax !== null) {
    return `${amount(posting.salaryMin)} – ${amount(posting.salaryMax)} / tháng`;
  }
  if (posting.salaryMin !== null) return `Từ ${amount(posting.salaryMin)} / tháng`;
  return `Đến ${amount(posting.salaryMax!)} / tháng`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value));
}

function PostingCard({ posting }: { posting: PostingSummary }) {
  return (
    <article className="public-posting-card">
      <img alt="" className="company-placeholder" height="48" src="/images/company-placeholder.svg" width="48" />
      <div className="public-posting-content">
        <div className="public-posting-heading">
          <div>
            <h3><Link href={`/jobs/${posting.id}`}>{posting.title}</Link></h3>
            <p className="public-posting-company">{posting.companyName}</p>
          </div>
          <span className="employment-badge">{employmentLabels[posting.employmentType]}</span>
        </div>
        <div className="public-posting-meta">
          <span><span aria-hidden="true">⌖</span> {posting.location}</span>
          <span><span aria-hidden="true">◷</span> {formatSalary(posting)}</span>
          <span>Hạn nộp {formatDate(posting.applicationDeadline)}</span>
        </div>
      </div>
      <Link aria-label={`Xem chi tiết: ${posting.title}`} className="posting-arrow" href={`/jobs/${posting.id}`}>
        <span aria-hidden="true">→</span>
      </Link>
    </article>
  );
}

type HomeSearchParams = Record<string, string | string[] | undefined>;

const searchText = z.string().trim().transform((value) => value.slice(0, 100) || undefined).optional().catch(undefined);
const homeSearchParamsSchema = z.object({
  q: searchText,
  location: searchText,
  type: z.enum(employmentTypes).optional().catch(undefined),
  minSalary: z.coerce.number().int().positive().safe().optional().catch(undefined),
  page: z.coerce.number().int().min(1).catch(1),
}).catch({ page: 1 });

function searchFilterFromParams(params: HomeSearchParams): SearchFilter {
  const firstValues = Object.fromEntries(
    Object.entries(params).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  );
  const parsed = homeSearchParamsSchema.parse(firstValues);

  return {
    q: parsed.q,
    location: parsed.location,
    employmentType: parsed.type,
    minSalary: parsed.minSalary,
    page: parsed.page,
  };
}

function searchHref(filter: SearchFilter, page: number) {
  const params = new URLSearchParams();
  if (filter.q) params.set('q', filter.q);
  if (filter.location) params.set('location', filter.location);
  if (filter.employmentType) params.set('type', filter.employmentType);
  if (filter.minSalary) params.set('minSalary', String(filter.minSalary));
  params.set('page', String(page));
  return `/?${params.toString()}`;
}

function PageNavigation({ page, pageCount, filter }: { page: number; pageCount: number; filter: SearchFilter }) {
  if (pageCount <= 1) return null;

  return (
    <nav aria-label="Phân trang tin tuyển dụng" className="pagination">
      {page > 1 ? <Link className="pagination-link" href={searchHref(filter, page - 1)}>← Trang trước</Link> : <span />}
      <span className="pagination-count">Trang {page} / {pageCount}</span>
      {page < pageCount ? <Link className="pagination-link" href={searchHref(filter, page + 1)}>Trang sau →</Link> : <span />}
    </nav>
  );
}

export default async function HomePage({ searchParams }: { searchParams: Promise<HomeSearchParams> }) {
  const filter = searchFilterFromParams(await searchParams);
  const postingsPage = await listOpenPostings(filter);
  const pageCount = Math.max(1, Math.ceil(postingsPage.total / postingsPage.pageSize));
  const hasFilters = Boolean(filter.q || filter.location || filter.employmentType || filter.minSalary);

  return (
    <main>
      <section aria-labelledby="home-title" className="home-hero">
        <div className="home-hero-image" />
        <div className="home-hero-content">
          <span className="eyebrow">Cơ hội mới mỗi ngày</span>
          <h1 id="home-title">Tìm công việc phù hợp với bạn</h1>
          <p>Khám phá những vị trí đang tuyển dụng từ các công ty trên khắp Việt Nam.</p>
          <a className="button button-primary" href="#job-search">Khám phá việc làm <span aria-hidden="true">↓</span></a>
        </div>
      </section>

      <section aria-labelledby="open-postings" className="page-shell home-listings">
        <form action="/" className="job-search-form" id="job-search" method="get">
          <label className="job-search-keyword field-label" htmlFor="search-keyword">
            Từ khóa
            <input autoComplete="off" className="text-input" defaultValue={filter.q ?? ''} id="search-keyword" name="q" placeholder="Ví dụ: kế toán, thiết kế..." type="search" />
          </label>
          <label className="field-label" htmlFor="search-location">
            Địa điểm
            <input className="text-input" defaultValue={filter.location ?? ''} id="search-location" name="location" placeholder="Ví dụ: Hà Nội" type="search" />
          </label>
          <label className="field-label" htmlFor="search-employment-type">
            Hình thức
            <select className="text-input select-input" defaultValue={filter.employmentType ?? ''} id="search-employment-type" name="type">
              <option value="">Tất cả hình thức</option>
              {Object.entries(employmentLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="field-label" htmlFor="search-min-salary">
            Lương tối thiểu
            <span className="salary-search-input">
              <input className="text-input" defaultValue={filter.minSalary ?? ''} id="search-min-salary" min="1" name="minSalary" placeholder="Tùy chọn" step="1" type="number" />
              <span>₫ / tháng</span>
            </span>
          </label>
          <div className="job-search-actions">
            <button className="button button-primary" type="submit">Tìm việc</button>
            {hasFilters ? <Link className="clear-search-link" href="/">Xóa bộ lọc</Link> : null}
          </div>
        </form>

        <div className="home-listings-heading">
          <div className="page-heading">
            <span className="eyebrow">Việc làm đang mở</span>
            <h2 id="open-postings">Cơ hội dành cho bạn</h2>
            <p>{postingsPage.total} {hasFilters ? 'kết quả phù hợp với bộ lọc của bạn.' : 'vị trí đang chờ ứng viên phù hợp.'}</p>
          </div>
          <span className="results-count">{postingsPage.total} việc làm</span>
        </div>

        {postingsPage.items.length > 0 ? (
          <div aria-label="Danh sách việc làm đang mở" className="public-posting-list">
            {postingsPage.items.map((posting) => <PostingCard key={posting.id} posting={posting} />)}
          </div>
        ) : (
          <div className="surface-card public-empty-state">
            <img alt="" height="180" src="/images/empty-search.svg" width="240" />
            <h3>{hasFilters ? 'Không tìm thấy tin phù hợp' : 'Chưa có tin tuyển dụng đang mở'}</h3>
            <p>{hasFilters ? 'Thử thay đổi từ khóa hoặc bộ lọc để xem thêm cơ hội.' : 'Các cơ hội mới sẽ được cập nhật tại đây. Hãy quay lại sau nhé.'}</p>
          </div>
        )}

        <PageNavigation filter={filter} page={postingsPage.page} pageCount={pageCount} />
      </section>
    </main>
  );
}
