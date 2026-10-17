import Link from 'next/link';
import { listMyPostings } from '@/actions/postings';
import type { JobPosting } from '@/actions/types';
import { PostingControls } from '@/components/postings/posting-controls';
import { formatDate, formatSalary, postingStatusLabels } from '@/components/format';
import { PageHeader, StatCard } from '@/components/ui/primitives';

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
            {postingStatusLabels[posting.displayStatus]}
          </span>
        </div>
        <div className="posting-meta">
          <span><span aria-hidden="true">⌖</span> {posting.location}</span>
          <span><span aria-hidden="true">◷</span> {formatSalary(posting.salaryMin, posting.salaryMax)}</span>
          <span>Hạn nộp {formatDate(posting.applicationDeadline)}</span>
        </div>
        {posting.hiddenAt ? <div className="hidden-posting-notice"><strong>Tin đã bị ẩn bởi quản trị viên</strong><p>{posting.hiddenReason}</p></div> : null}
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
        <PageHeader description="Quản lý tin đang đăng và chuẩn bị cơ hội mới cho ứng viên." eyebrow="Không gian nhà tuyển dụng" title="Tin tuyển dụng của tôi" />
        <Link className="button button-primary create-posting-button" href="/employer/postings/new">
          <span aria-hidden="true">＋</span> Tạo tin tuyển dụng
        </Link>
      </div>

      <div aria-label="Tổng quan tin tuyển dụng" className="posting-stats">
        <StatCard label="Tổng số tin" value={postings.length} />
        <StatCard label="Đang tuyển" value={activeCount} />
        <StatCard label="Bản nháp" value={draftCount} />
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
