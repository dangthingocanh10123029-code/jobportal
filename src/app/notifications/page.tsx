import { getCurrentProfile } from '@/actions/auth';
import { listMyNotifications } from '@/actions/notifications';
import { NotificationsList } from '@/components/notifications/notifications-list';
import { redirect } from 'next/navigation';

export default async function NotificationsPage() {
  const [profile, notifications] = await Promise.all([getCurrentProfile(), listMyNotifications()]);
  if (!profile) redirect('/login?next=%2Fnotifications');

  return (
    <main className="page-shell notifications-page">
      <div className="notifications-heading">
        <div className="page-heading">
          <span className="eyebrow">Cập nhật mới nhất</span>
          <h1>Thông báo</h1>
          <p>Theo dõi các cập nhật về hồ sơ ứng tuyển và việc làm mới khớp thông báo của bạn.</p>
        </div>
      </div>
      <NotificationsList notifications={notifications} />
    </main>
  );
}
