'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { AppNotification } from '@/actions/types';
import { markNotificationsReadAction } from '@/actions/notifications';

function absoluteTime(value: string) {
  const date = new Date(new Date(value).getTime() + 7 * 60 * 60 * 1000);
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  const hour = String(date.getUTCHours()).padStart(2, '0');
  const minute = String(date.getUTCMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hour}:${minute} (giờ Việt Nam)`;
}

function relativeTime(value: string, now: number) {
  const delta = new Date(value).getTime() - now;
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
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const updateNow = () => setNow(Date.now());
    updateNow();
    const intervalId = window.setInterval(updateNow, 30_000);
    return () => window.clearInterval(intervalId);
  }, []);

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
        <p>Các cập nhật về hồ sơ ứng tuyển và việc làm mới khớp thông báo việc làm sẽ xuất hiện ở đây.</p>
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
          const timeLabel = now === null
            ? absoluteTime(notification.createdAt)
            : relativeTime(notification.createdAt, now);
          return (
            <button
              aria-label={`${notification.readAt ? '' : 'Chưa đọc: '}${notification.title}. ${notification.body}. ${timeLabel}`}
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
                <time
                  className="notification-time"
                  dateTime={notification.createdAt}
                  title={absoluteTime(notification.createdAt)}
                >
                  {timeLabel}
                </time>
              </span>
              {busy ? <span aria-hidden="true" className="notification-opening">Đang mở…</span> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
