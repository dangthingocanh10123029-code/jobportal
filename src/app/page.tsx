import Link from 'next/link';
import { listOpenPostings } from '@/actions/postings';
import type { EmploymentType, PostingSummary } from '@/actions/types';

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

function PageNavigation({ page, pageCount }: { page: number; pageCount: number }) {
  if (pageCount <= 1) return null;

  return (
    <nav aria-label="Phân trang tin tuyển dụng" className="pagination">
      {page > 1 ? <Link className="pagination-link" href={`/?page=${page - 1}`}>← Trang trước</Link> : <span />}
      <span className="pagination-count">Trang {page} / {pageCount}</span>
      {page < pageCount ? <Link className="pagination-link" href={`/?page=${page + 1}`}>Trang sau →</Link> : <span />}
    </nav>
  );
}

export default async function HomePage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: pageParam } = await searchParams;
  const postingsPage = await listOpenPostings({ page: Number(pageParam) || 1 });
  const pageCount = Math.max(1, Math.ceil(postingsPage.total / postingsPage.pageSize));

  return (
    <main>
      <section aria-labelledby="home-title" className="home-hero">
        <div className="home-hero-image" />
        <div className="home-hero-content">
          <span className="eyebrow">Cơ hội mới mỗi ngày</span>
          <h1 id="home-title">Tìm công việc phù hợp với bạn</h1>
          <p>Khám phá những vị trí đang tuyển dụng từ các công ty trên khắp Việt Nam.</p>
          <a className="button button-primary" href="#open-postings">Khám phá việc làm <span aria-hidden="true">↓</span></a>
        </div>
      </section>

      <section aria-labelledby="open-postings" className="page-shell home-listings">
        <div className="home-listings-heading">
          <div className="page-heading">
            <span className="eyebrow">Việc làm đang mở</span>
            <h2 id="open-postings">Cơ hội dành cho bạn</h2>
            <p>{postingsPage.total} vị trí đang chờ ứng viên phù hợp.</p>
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
            <h3>Chưa có tin tuyển dụng đang mở</h3>
            <p>Các cơ hội mới sẽ được cập nhật tại đây. Hãy quay lại sau nhé.</p>
          </div>
        )}

        <PageNavigation page={postingsPage.page} pageCount={pageCount} />
      </section>
    </main>
  );
}
