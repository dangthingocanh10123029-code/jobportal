import Link from 'next/link';
import { notFound } from 'next/navigation';
import { listApplicationsForPosting } from '@/actions/applications';
import { EmployerApplicationList } from '@/components/applications/employer-application-list';

export default async function EmployerPostingApplicationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const applications = await listApplicationsForPosting(id);
  if (applications === null) notFound();

  return (
    <main className="page-shell employer-applications-page">
      <Link className="back-link" href="/employer/postings">← Quay lại tin tuyển dụng</Link>
      <div className="page-heading employer-applications-heading">
        <span className="eyebrow">Quản lý tuyển dụng</span>
        <h1>Hồ sơ ứng tuyển</h1>
        <p>Xem thông tin ứng viên, tải CV và cập nhật tiến trình xét duyệt.</p>
      </div>

      {applications.length > 0 ? (
        <EmployerApplicationList applications={applications} />
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
