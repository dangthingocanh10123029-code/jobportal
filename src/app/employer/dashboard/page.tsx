import Link from 'next/link';
import { getEmployerDashboard } from '@/actions/dashboard';
import type { ApplicationStatus } from '@/actions/types';
import { applicationStatusLabels, postingStatusLabels } from '@/components/format';

const statuses: ApplicationStatus[] = ['SUBMITTED', 'REVIEWING', 'INTERVIEWING', 'OFFERED', 'HIRED', 'REJECTED', 'WITHDRAWN'];

function TotalCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <article className="dashboard-total-card">
      <span aria-hidden="true" className="dashboard-total-icon">{icon}</span>
      <div><p>{label}</p><strong>{value.toLocaleString('vi-VN')}</strong></div>
    </article>
  );
}

export default async function EmployerDashboardPage() {
  const dashboard = await getEmployerDashboard();
  if (!dashboard) return null;

  const maxApplications = Math.max(1, ...statuses.map((status) => dashboard.byStatus[status]));

  return (
    <main className="page-shell employer-dashboard-page">
      <div className="page-heading dashboard-heading">
        <span className="eyebrow">Không gian nhà tuyển dụng</span>
        <h1>Dashboard</h1>
        <p>Tổng quan hiệu quả tuyển dụng và hoạt động ứng tuyển của công ty.</p>
      </div>

      <section aria-label="Tổng quan tuyển dụng" className="dashboard-totals">
        <TotalCard icon="▤" label="Tin tuyển dụng" value={dashboard.totals.postings} />
        <TotalCard icon="◉" label="Đang mở" value={dashboard.totals.open} />
        <TotalCard icon="♧" label="Đơn ứng tuyển" value={dashboard.totals.applications} />
        <TotalCard icon="⌁" label="Lượt xem" value={dashboard.totals.views} />
      </section>

      <section aria-labelledby="dashboard-status-title" className="surface-card dashboard-status-card">
        <div className="dashboard-section-heading">
          <div><span className="eyebrow">Tiến độ tuyển dụng</span><h2 id="dashboard-status-title">Đơn theo trạng thái</h2></div>
          <span className="dashboard-total-count">{dashboard.totals.applications.toLocaleString('vi-VN')} đơn</span>
        </div>
        <div className="dashboard-status-list">
          {statuses.map((status) => {
            const count = dashboard.byStatus[status];
            return (
              <div className="dashboard-status-row" key={status}>
                <span className="dashboard-status-label">{applicationStatusLabels[status]}</span>
                <span aria-label={`${applicationStatusLabels[status]}: ${count}`} className="dashboard-status-track">
                  <span className={`dashboard-status-bar status-${status.toLowerCase()}`} style={{ width: `${count ? Math.max(4, (count / maxApplications) * 100) : 0}%` }} />
                </span>
                <strong className="dashboard-status-number">{count}</strong>
              </div>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="dashboard-postings-title" className="surface-card dashboard-postings-card">
        <div className="dashboard-section-heading">
          <div><span className="eyebrow">Hiệu quả tin tuyển dụng</span><h2 id="dashboard-postings-title">Tin của tôi</h2></div>
          <Link className="dashboard-view-all" href="/employer/postings">Quản lý tin <span aria-hidden="true">→</span></Link>
        </div>
        {dashboard.postings.length ? (
          <div className="dashboard-table-wrap">
            <table className="dashboard-postings-table">
              <thead><tr><th scope="col">Tin tuyển dụng</th><th scope="col">Trạng thái</th><th scope="col">Lượt xem</th><th scope="col">Đơn</th></tr></thead>
              <tbody>
                {dashboard.postings.map((posting) => (
                  <tr key={posting.id}>
                    <td data-label="Tin tuyển dụng"><Link className="dashboard-posting-title" href={`/employer/postings/${posting.id}/applications`}>{posting.title}</Link></td>
                    <td data-label="Trạng thái"><span className={`posting-status status-${posting.displayStatus.toLowerCase()}`}>{postingStatusLabels[posting.displayStatus]}</span></td>
                    <td data-label="Lượt xem">{posting.views.toLocaleString('vi-VN')}</td>
                    <td data-label="Đơn">{posting.applications.toLocaleString('vi-VN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="dashboard-postings-empty"><p>Bạn chưa có tin tuyển dụng nào.</p><Link className="button button-primary button-small" href="/employer/postings/new">Tạo tin tuyển dụng</Link></div>
        )}
      </section>
    </main>
  );
}
