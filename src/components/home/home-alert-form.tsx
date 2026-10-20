'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { createJobAlertAction } from '@/actions/alerts';

export function HomeAlertForm({ atLimit }: { atLimit: boolean }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = String(new FormData(event.currentTarget).get('q') ?? '').trim();
    setPending(true);
    setError('');
    try {
      const result = await createJobAlertAction({ name: `Việc làm: ${q}`.slice(0, 100), filter: { q } });
      if (result.success) setCreated(true); else setError(result.error);
    } catch {
      setError('Không thể tạo thông báo việc làm. Vui lòng thử lại.');
    } finally {
      setPending(false);
    }
  }

  if (created) {
    return (
      <p className="alert-confirmation" role="status">
        Đã bật thông báo. <Link href="/candidate/alerts">Quản lý thông báo</Link>
      </p>
    );
  }
  if (atLimit) {
    return <p className="alert-confirmation">Bạn đã có đủ 5 thông báo việc làm. <Link href="/candidate/alerts">Xóa bớt</Link> để tạo mới.</p>;
  }
  return (
    <>
      <form className="inline-form" onSubmit={submit}>
        <label className="visually-hidden" htmlFor="home-alert-keyword">Từ khóa công việc</label>
        <input className="text-input" id="home-alert-keyword" maxLength={100} name="q" placeholder="Ví dụ: kế toán, thiết kế…" required type="text" />
        <button className="button button-primary" disabled={pending} type="submit">{pending ? 'Đang lưu…' : 'Nhận thông báo'}</button>
      </form>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </>
  );
}
