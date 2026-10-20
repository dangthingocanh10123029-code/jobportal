'use client';

import Link from 'next/link';
import { useId, useState, type FormEvent } from 'react';
import { createJobAlertAction } from '@/actions/alerts';
import type { AlertFilter } from '@/actions/types';
import { Button, Input } from '@/components/ui/primitives';
import { describeAlertFilter } from './describe';

const ALERT_LIMIT = 5;

export function CreateAlertButton({ filter, alertCount }: { filter: AlertFilter; alertCount: number }) {
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(false);
  const atLimit = alertCount >= ALERT_LIMIT;
  const description = describeAlertFilter(filter);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get('name') ?? '');
    setPending(true);
    setError('');
    try {
      const result = await createJobAlertAction({ name, filter });
      if (result.success) { setCreated(true); setOpen(false); } else setError(result.error);
    } catch {
      setError('Không thể tạo thông báo việc làm. Vui lòng thử lại.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="create-alert">
      {!open && !created ? (
        <Button aria-describedby={atLimit ? `${inputId}-limit` : undefined} disabled={atLimit} onClick={() => setOpen(true)} size="small" type="button" variant="quiet">
          <span aria-hidden="true">🔔</span> Tạo thông báo việc làm
        </Button>
      ) : null}
      {open ? (
        <form className="create-alert-form" onSubmit={submit}>
          <label className="field-label" htmlFor={inputId}>
            Tên thông báo
            <Input autoFocus defaultValue={description.slice(0, 100)} id={inputId} maxLength={100} name="name" required />
          </label>
          <p className="field-hint">Bộ lọc: {description}</p>
          <div className="create-alert-actions">
            <Button disabled={pending} size="small" type="submit">{pending ? 'Đang lưu…' : 'Lưu thông báo'}</Button>
            <Button disabled={pending} onClick={() => { setOpen(false); setError(''); }} size="small" type="button" variant="quiet">Hủy</Button>
          </div>
        </form>
      ) : null}
      <div aria-live="polite" role="status">
        {created ? <p className="form-success">Đã tạo thông báo. Bạn sẽ nhận thông báo khi có tin mới phù hợp. <Link href="/candidate/alerts">Quản lý thông báo</Link></p> : null}
        {atLimit && !created ? <p className="field-hint" id={`${inputId}-limit`}>Bạn đã có đủ {ALERT_LIMIT} thông báo việc làm. <Link href="/candidate/alerts">Xóa bớt</Link> để tạo mới.</p> : null}
      </div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </div>
  );
}
