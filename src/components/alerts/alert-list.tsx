'use client';

import Link from 'next/link';
import { useState } from 'react';
import { deleteJobAlertAction, updateJobAlertAction } from '@/actions/alerts';
import type { ActionResult, JobAlert } from '@/actions/types';
import { formatDate } from '@/components/format';
import { alertSearchHref, describeAlertFilter } from './describe';

export function AlertList({ initialAlerts }: { initialAlerts: JobAlert[] }) {
  const [alerts, setAlerts] = useState(initialAlerts);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  async function run(alert: JobAlert, task: () => Promise<ActionResult<unknown>>, done: () => void, message: string) {
    setPendingId(alert.id);
    setError('');
    setStatus('');
    try {
      const result = await task();
      if (result.success) { done(); setStatus(message); } else setError(result.error);
    } catch {
      setError('Không thể cập nhật thông báo. Vui lòng thử lại.');
    } finally {
      setPendingId(null);
    }
  }

  function toggle(alert: JobAlert) {
    const active = !alert.active;
    return run(alert, () => updateJobAlertAction({ id: alert.id, active }),
      () => setAlerts((list) => list.map((a) => (a.id === alert.id ? { ...a, active } : a))),
      `${active ? 'Đã bật' : 'Đã tắt'} thông báo “${alert.name}”.`);
  }

  function remove(alert: JobAlert) {
    if (!window.confirm(`Xóa thông báo “${alert.name}”?`)) return;
    return run(alert, () => deleteJobAlertAction({ id: alert.id }),
      () => setAlerts((list) => list.filter((a) => a.id !== alert.id)),
      `Đã xóa thông báo “${alert.name}”.`);
  }

  return (
    <>
      <p className="job-alert-count">Đang dùng {alerts.length}/5 thông báo</p>
      <div aria-live="polite" className="alert-list-status" role="status">{status ? <p className="form-success">{status}</p> : null}</div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {alerts.length ? (
        <ul aria-label="Danh sách thông báo việc làm" className="job-alert-list">
          {alerts.map((alert) => {
            const busy = pendingId === alert.id;
            return (
              <li className={`surface-card job-alert-card${alert.active ? '' : ' is-paused'}`} key={alert.id}>
                <div className="job-alert-content">
                  <div className="job-alert-heading">
                    <h2>{alert.name}</h2>
                    <span className={`ui-badge ui-badge-${alert.active ? 'success' : 'neutral'}`}>{alert.active ? 'Đang bật' : 'Đã tắt'}</span>
                  </div>
                  <p>{describeAlertFilter(alert.filter)}</p>
                  <p className="job-alert-meta">Tạo ngày {formatDate(alert.createdAt)} · {alert.lastMatchedAt ? `Tin khớp gần nhất ${formatDate(alert.lastMatchedAt)}` : 'Chưa có tin mới khớp'}</p>
                </div>
                <div className="job-alert-actions">
                  <Link className="button button-quiet button-small" href={alertSearchHref(alert.filter)}>Xem việc làm</Link>
                  <label className="job-alert-switch">
                    <input checked={alert.active} disabled={busy} onChange={() => toggle(alert)} role="switch" type="checkbox" />
                    <span>Nhận thông báo</span>
                  </label>
                  <button aria-label={`Xóa thông báo ${alert.name}`} className="button button-quiet button-small job-alert-delete" disabled={busy} onClick={() => remove(alert)} type="button">Xóa</button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <section className="surface-card candidate-saved-empty">
          <img alt="" height="180" src="/images/empty-notifications.svg" width="240" />
          <h2>Chưa có thông báo việc làm</h2>
          <p>Tìm việc với bộ lọc bạn muốn rồi bấm “Tạo thông báo việc làm” để nhận tin mới phù hợp.</p>
          <Link className="button button-primary" href="/#job-search">Tìm việc làm</Link>
        </section>
      )}
    </>
  );
}
