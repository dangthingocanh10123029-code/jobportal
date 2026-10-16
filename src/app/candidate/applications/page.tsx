import Link from 'next/link';
import { listMyApplications } from '@/actions/applications';
import type { ApplicationStatus } from '@/actions/types';

const statusLabels: Record<ApplicationStatus, string> = {
  SUBMITTED: 'Đã nộp',
  REVIEWING: 'Đang xem xét',
  INTERVIEWING: 'Phỏng vấn',
  OFFERED: 'Đã gửi đề nghị',
  HIRED: 'Đã tuyển dụng',
  REJECTED: 'Không phù hợp',
  WITHDRAWN: 'Đã rút hồ sơ',
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

export default async function CandidateApplicationsPage() {
  const applications = await listMyApplications();

  return (
    <main className="page-shell candidate-applications-page">
      <div className="page-heading candidate-applications-heading">
        <span className="eyebrow">Hành trình ứng tuyển</span>
        <h1>Đơn của tôi</h1>
        <p>Theo dõi trạng thái và cập nhật mới nhất của các hồ sơ bạn đã gửi.</p>
      </div>

      {applications.length > 0 ? (
        <div aria-label="Danh sách hồ sơ ứng tuyển" className="candidate-application-list">
          {applications.map((application) => (
            <article className="candidate-application-card" key={application.id}>
              <div className="candidate-application-main">
                <div className="candidate-application-heading">
                  <div>
                    <h2><Link href={`/candidate/applications/${application.id}`}>{application.postingTitle}</Link></h2>
                    <p>{application.companyName}</p>
                  </div>
                  <span className={`application-status status-${application.status.toLowerCase()}`}>
                    <span aria-hidden="true" className="status-dot" />
                    {statusLabels[application.status]}
                  </span>
                </div>
                <div className="candidate-application-meta">
                  <span>Đã nộp ngày {formatDate(application.createdAt)}</span>
                  <Link aria-label={`Xem lịch sử hồ sơ: ${application.postingTitle}`} href={`/candidate/applications/${application.id}`}>
                    Xem lịch sử <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <section className="surface-card candidate-applications-empty">
          <img alt="" height="180" src="/images/empty-applications.svg" width="240" />
          <h2>Bạn chưa có hồ sơ ứng tuyển</h2>
          <p>Khi tìm được công việc phù hợp, hồ sơ và tiến trình ứng tuyển sẽ xuất hiện tại đây.</p>
          <Link className="button button-primary" href="/">Khám phá việc làm</Link>
        </section>
      )}
    </main>
  );
}
