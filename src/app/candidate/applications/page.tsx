import Link from 'next/link';
import { listMyApplications } from '@/actions/applications';
import { applicationStatusLabels, formatDate } from '@/components/format';
import { Badge, icon, PageHeader } from '@/components/ui/primitives';
import { ArrowRight } from 'lucide-react';

export default async function CandidateApplicationsPage() {
  const applications = await listMyApplications();

  return (
    <main className="page-shell candidate-applications-page">
      <PageHeader className="candidate-applications-heading" description="Theo dõi trạng thái và cập nhật mới nhất của các hồ sơ bạn đã gửi." eyebrow="Hành trình ứng tuyển" title="Đơn của tôi" />

      {applications.length > 0 ? (
        <div aria-label="Danh sách hồ sơ ứng tuyển" className="candidate-application-list">
          {applications.map((application) => (
            <article className="candidate-application-card" key={application.id}>
              <div className="candidate-application-main">
                <div className="candidate-application-heading">
                  <div>
                    <h2><Link href={`/candidate/applications/${application.id}`} prefetch={false}>{application.postingTitle}</Link></h2>
                    <p>{application.companyName}</p>
                  </div>
                  <span className={`application-status status-${application.status.toLowerCase()}`}>
                    <span aria-hidden="true" className="status-dot" />
                    {applicationStatusLabels[application.status]}
                  </span>
                </div>
                <div className="candidate-application-meta">
                  <span>Đã nộp ngày {formatDate(application.createdAt)}</span>
                  {application.cvSource === 'ONLINE' ? <Badge tone="info">CV online</Badge> : null}
                  <Link aria-label={`Xem lịch sử hồ sơ: ${application.postingTitle}`} href={`/candidate/applications/${application.id}`} prefetch={false}>
                    Xem lịch sử <ArrowRight {...icon} />
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
