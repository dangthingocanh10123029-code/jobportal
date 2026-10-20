import Link from 'next/link';
import { notFound } from 'next/navigation';
import { listApplicationsForPosting } from '@/actions/applications';
import { listInterviewsForApplication } from '@/actions/interviews';
import { EmployerApplicationList } from '@/components/applications/employer-application-list';

export default async function EmployerPostingApplicationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const applications = await listApplicationsForPosting(id);
  if (applications === null) notFound();
  // ponytail: one request per reviewed application; add a per-posting endpoint if postings get hundreds of applications.
  const reviewed = applications.filter((application) => application.status !== 'SUBMITTED' && application.status !== 'WITHDRAWN');
  const interviews = Object.fromEntries(
    await Promise.all(reviewed.map(async (application) => [application.id, (await listInterviewsForApplication(application.id)) ?? []] as const)),
  );

  return (
    <main className="page-shell employer-applications-page">
      <Link className="back-link" href="/employer/postings">← Quay lại tin tuyển dụng</Link>
      <div className="page-heading employer-applications-heading">
        <span className="eyebrow">Quản lý tuyển dụng</span>
        <h1>Hồ sơ ứng tuyển</h1>
        <p>Xem thông tin ứng viên, tải CV, đặt lịch phỏng vấn và cập nhật tiến trình xét duyệt.</p>
      </div>

      {applications.length > 0 ? (
        <EmployerApplicationList applications={applications} interviews={interviews} />
      ) : (
        <section className="surface-card employer-applications-empty">
          <img alt="" height="180" src="/images/empty-applications.svg" width="240" />
          <h2>Chưa có hồ sơ ứng tuyển</h2>
          <p>Khi ứng viên nộp hồ sơ vào tin này, bạn sẽ thấy thông tin tại đây.</p>
        </section>
      )}
    </main>
  );
}
