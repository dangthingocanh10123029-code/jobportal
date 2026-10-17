'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { AppNotification } from '@/actions/types';
import { markNotificationsReadAction } from '@/actions/notifications';

function relativeTime(value: string) {
  const delta = new Date(value).getTime() - Date.now();
  const seconds = Math.round(delta / 1000);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 60 * 60 * 24 * 365], ['month', 60 * 60 * 24 * 30], ['week', 60 * 60 * 24 * 7],
    ['day', 60 * 60 * 24], ['hour', 60 * 60], ['minute', 60], ['second', 1],
  ];
  const formatter = new Intl.RelativeTimeFormat('vi', { numeric: 'auto' });
  const match = units.find(([, size]) => Math.abs(seconds) >= size);
  if (!match) return 'Vừa xong';
  return formatter.format(Math.round(seconds / match[1]), match[0]);
}

export function NotificationsList({ notifications }: { notifications: AppNotification[] }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function openNotification(notification: AppNotification) {
    if (!notification.link.startsWith('/') || notification.link.startsWith('//')) {
      setError('Liên kết thông báo không hợp lệ.');
      return;
    }
    setError('');
    setPendingId(notification.id);
    startTransition(async () => {
      if (!notification.readAt) {
        const result = await markNotificationsReadAction({ ids: [notification.id] });
        if (!result.success) {
          setError(result.error);
          setPendingId(null);
          return;
        }
      }
      router.push(notification.link);
      router.refresh();
    });
  }

  function markAllRead() {
    setError('');
    startTransition(async () => {
      const result = await markNotificationsReadAction({});
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (notifications.length === 0) {
    return (
      <section className="surface-card notifications-empty">
        <img alt="" height="180" src="/images/empty-notifications.svg" width="240" />
        <h2>Bạn chưa có thông báo</h2>
        <p>Các cập nhật về hồ sơ ứng tuyển sẽ xuất hiện ở đây.</p>
      </section>
    );
  }

  return (
    <section aria-label="Danh sách thông báo" className="notifications-content">
      <div className="notifications-actions">
        {error ? <p className="form-error" role="alert">{error}</p> : <span />}
        <button className="button button-quiet button-small" disabled={isPending} onClick={markAllRead} type="button">
          Đánh dấu tất cả đã đọc
        </button>
      </div>
      <div className="notification-list">
        {notifications.map((notification) => {
          const busy = isPending && pendingId === notification.id;
          return (
            <button
              aria-label={`${notification.readAt ? '' : 'Chưa đọc: '}${notification.title}. ${notification.body}. ${relativeTime(notification.createdAt)}`}
              className={`notification-item${notification.readAt ? '' : ' notification-unread'}`}
              disabled={isPending}
              key={notification.id}
              onClick={() => openNotification(notification)}
              type="button"
            >
              <span aria-hidden="true" className="notification-marker">{notification.readAt ? null : <span />}</span>
              <span className="notification-copy">
                <span className="notification-title">{notification.title}</span>
                <span className="notification-body">{notification.body}</span>
                <time className="notification-time" dateTime={notification.createdAt}>{relativeTime(notification.createdAt)}</time>
              </span>
              {busy ? <span aria-hidden="true" className="notification-opening">Đang mở…</span> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
