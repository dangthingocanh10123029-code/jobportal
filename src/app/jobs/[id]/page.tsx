import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCurrentProfile } from '@/actions/auth';
import { getMyApplicationForPosting } from '@/actions/applications';
import { getPostingDetail } from '@/actions/postings';
import { ApplicationForm } from '@/components/applications/application-form';
import type { EmploymentType, PostingDetail } from '@/actions/types';

const employmentLabels: Record<EmploymentType, string> = {
  FULL_TIME: 'Toàn thời gian',
  PART_TIME: 'Bán thời gian',
  INTERNSHIP: 'Thực tập',
  CONTRACT: 'Hợp đồng',
};

function formatSalary(posting: PostingDetail) {
  if (posting.salaryMin === null && posting.salaryMax === null) return 'Thỏa thuận';
  const amount = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value)} ₫`;
  if (posting.salaryMin !== null && posting.salaryMax !== null) {
    return `${amount(posting.salaryMin)} – ${amount(posting.salaryMax)} / tháng`;
  }
  if (posting.salaryMin !== null) return `Từ ${amount(posting.salaryMin)} / tháng`;
  return `Đến ${amount(posting.salaryMax!)} / tháng`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(value));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const posting = await getPostingDetail(id);
  return posting
    ? { title: `${posting.title} — Job Portal`, description: `${posting.title} tại ${posting.companyName}` }
    : { title: 'Không tìm thấy tin — Job Portal' };
}

export default async function PostingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const posting = await getPostingDetail(id);
  if (!posting) notFound();
  const profile = posting.isOpen ? await getCurrentProfile() : null;
  const application = posting.isOpen && profile?.role === 'CANDIDATE'
    ? await getMyApplicationForPosting(id)
    : null;

  return (
    <main className="page-shell posting-detail-page">
      <Link className="back-link" href="/">← Danh sách việc làm</Link>

      {!posting.isOpen ? (
        <section aria-live="polite" className="posting-closed-notice">
          <span aria-hidden="true">ⓘ</span>
          <div>
            <strong>Tin tuyển dụng này không còn nhận hồ sơ</strong>
            <p>{posting.displayStatus === 'CLOSED' ? 'Nhà tuyển dụng đã đóng tin.' : 'Đã hết hạn nộp hồ sơ.'}</p>
          </div>
        </section>
      ) : null}

      <article className="surface-card posting-detail-card">
        <header className="posting-detail-header">
          <img alt="" className="company-placeholder company-placeholder-large" height="64" src="/images/company-placeholder.svg" width="64" />
          <div className="posting-detail-title">
            <span className="eyebrow">Cơ hội nghề nghiệp</span>
            <h1>{posting.title}</h1>
            <p>{posting.companyName}</p>
          </div>
        </header>

        <div className="posting-detail-meta">
          <div><span aria-hidden="true">⌖</span><span><small>Địa điểm</small><strong>{posting.location}</strong></span></div>
          <div><span aria-hidden="true">◷</span><span><small>Hình thức</small><strong>{employmentLabels[posting.employmentType]}</strong></span></div>
          <div><span aria-hidden="true">₫</span><span><small>Mức lương</small><strong>{formatSalary(posting)}</strong></span></div>
          <div><span aria-hidden="true">▣</span><span><small>Hạn nộp</small><strong>{formatDate(posting.applicationDeadline)}</strong></span></div>
        </div>

        <section aria-labelledby="description-title" className="posting-description">
          <h2 id="description-title">Mô tả công việc</h2>
          <p>{posting.description}</p>
        </section>

        {posting.isOpen && profile?.role === 'CANDIDATE' ? (
          <footer className="posting-detail-footer">
            {application ? (
              <div aria-live="polite" className="application-submitted">
                <span aria-hidden="true">✓</span>
                <div>
                  <strong>Đã nộp hồ sơ</strong>
                  <p>Hồ sơ ứng tuyển của bạn đã được gửi đến nhà tuyển dụng.</p>
                </div>
              </div>
            ) : <ApplicationForm postingId={posting.id} />}
          </footer>
        ) : posting.isOpen && !profile ? (
          <footer className="posting-detail-footer">
            <p>Quan tâm đến cơ hội này? Đăng nhập bằng tài khoản ứng viên để nộp hồ sơ.</p>
            <Link className="button button-primary" href={`/login?next=${encodeURIComponent(`/jobs/${posting.id}`)}`}>Đăng nhập để ứng tuyển</Link>
          </footer>
        ) : null}
      </article>
    </main>
  );
}
