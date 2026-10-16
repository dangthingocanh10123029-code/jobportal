import Link from 'next/link';
import { listMyPostings } from '@/actions/postings';
import type { DisplayPostingStatus, JobPosting } from '@/actions/types';
import { PostingControls } from '@/components/postings/posting-controls';

const statusLabels: Record<DisplayPostingStatus, string> = {
  DRAFT: 'Bản nháp',
  PUBLISHED: 'Đang đăng',
  CLOSED: 'Đã đóng',
  EXPIRED: 'Hết hạn',
};

function formatSalary(posting: JobPosting) {
  if (posting.salaryMin === null && posting.salaryMax === null) return 'Thỏa thuận';
  const format = (amount: number) => `${new Intl.NumberFormat('vi-VN').format(amount)} ₫`;
  if (posting.salaryMin !== null && posting.salaryMax !== null) {
    return `${format(posting.salaryMin)} – ${format(posting.salaryMax)} / tháng`;
  }
  if (posting.salaryMin !== null) return `Từ ${format(posting.salaryMin)} / tháng`;
  return `Đến ${format(posting.salaryMax!)} / tháng`;
}

function PostingCard({ posting }: { posting: JobPosting }) {
  return (
    <article className="posting-card">
      <div className="posting-card-main">
        <div className="posting-card-title-row">
          <div>
            <h2>{posting.title}</h2>
            <p className="posting-company">{posting.companyName}</p>
          </div>
          <span className={`posting-status status-${posting.displayStatus.toLowerCase()}`}>
            <span aria-hidden="true" className="status-dot" />
            {statusLabels[posting.displayStatus]}
          </span>
        </div>
        <div className="posting-meta">
          <span><span aria-hidden="true">⌖</span> {posting.location}</span>
          <span><span aria-hidden="true">◷</span> {formatSalary(posting)}</span>
          <span>Hạn nộp {new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(posting.applicationDeadline))}</span>
        </div>
      </div>
      <div className="posting-card-actions">
        <Link className="button button-quiet button-small" href={`/employer/postings/${posting.id}/applications`}>
          Xem hồ sơ
        </Link>
        <PostingControls posting={posting} />
      </div>
    </article>
  );
}

export default async function EmployerPostingsPage() {
  const postings = await listMyPostings();
  const activeCount = postings.filter(({ displayStatus }) => displayStatus === 'PUBLISHED').length;
  const draftCount = postings.filter(({ displayStatus }) => displayStatus === 'DRAFT').length;

  return (
    <main className="page-shell employer-postings-page">
      <div className="employer-page-topline">
        <div className="page-heading">
          <span className="eyebrow">Không gian nhà tuyển dụng</span>
          <h1>Tin tuyển dụng của tôi</h1>
          <p>Quản lý tin đang đăng và chuẩn bị cơ hội mới cho ứng viên.</p>
        </div>
        <Link className="button button-primary create-posting-button" href="/employer/postings/new">
          <span aria-hidden="true">＋</span> Tạo tin tuyển dụng
        </Link>
      </div>

      <div aria-label="Tổng quan tin tuyển dụng" className="posting-stats">
        <div className="posting-stat"><span>Tổng số tin</span><strong>{postings.length}</strong></div>
        <div className="posting-stat"><span>Đang tuyển</span><strong>{activeCount}</strong></div>
        <div className="posting-stat"><span>Bản nháp</span><strong>{draftCount}</strong></div>
      </div>

      {postings.length ? (
        <section aria-label="Danh sách tin tuyển dụng" className="posting-list">
          {postings.map((posting) => <PostingCard key={posting.id} posting={posting} />)}
        </section>
      ) : (
        <section className="surface-card postings-empty-state">
          <img alt="" height="180" src="/images/empty-postings.svg" width="240" />
          <h2>Chưa có tin tuyển dụng nào</h2>
          <p>Tạo tin đầu tiên để giới thiệu cơ hội việc làm tại công ty của bạn.</p>
          <Link className="button button-primary" href="/employer/postings/new">Tạo tin đầu tiên</Link>
        </section>
      )}
    </main>
  );
}
