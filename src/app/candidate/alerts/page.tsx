import { listJobAlerts } from '@/actions/alerts';
import { AlertList } from '@/components/alerts/alert-list';

export default async function JobAlertsPage() {
  const alerts = await listJobAlerts();
  return (
    <main className="page-shell candidate-saved-page">
      <div className="page-heading"><span className="eyebrow">Thông báo việc làm</span><h1>Thông báo việc làm của tôi</h1><p>Nhận thông báo trong ứng dụng khi có tin mới khớp bộ lọc.</p></div>
      <AlertList initialAlerts={alerts} />
    </main>
  );
}
