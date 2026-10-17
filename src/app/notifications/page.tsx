import { getCurrentProfile } from '@/actions/auth';
import { listMyNotifications } from '@/actions/notifications';
import { NotificationsList } from '@/components/notifications/notifications-list';
import { redirect } from 'next/navigation';

export default async function NotificationsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login?next=%2Fnotifications');
  const notifications = await listMyNotifications();

  return (
    <main className="page-shell notifications-page">
      <div className="notifications-heading">
        <div className="page-heading">
          <span className="eyebrow">Cập nhật mới nhất</span>
          <h1>Thông báo</h1>
          <p>Theo dõi các cập nhật về hồ sơ ứng tuyển của bạn.</p>
        </div>
      </div>
      <NotificationsList notifications={notifications} />
    </main>
  );
}
