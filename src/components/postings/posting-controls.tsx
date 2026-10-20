'use client';

import Link from 'next/link';
import { useState } from 'react';
import { closePostingAction, publishPostingAction } from '@/actions/postings';
import type { JobPosting } from '@/actions/types';

export function PostingControls({ posting }: { posting: JobPosting }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function changeStatus(action: typeof publishPostingAction | typeof closePostingAction, confirmMessage: string) {
    if (!window.confirm(confirmMessage)) return;
    setPending(true);
    setError('');
    try {
      const result = await action({ id: posting.id });
      if (!result.success) setError(result.error);
    } catch {
      setError('Không thể cập nhật trạng thái tin. Vui lòng thử lại.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="posting-controls-wrap">
      <div className="posting-controls">
        {posting.status !== 'CLOSED' ? <Link aria-label={`Sửa tin ${posting.title}`} className="button button-quiet button-small" href={`/employer/postings/${posting.id}/edit`}>Chỉnh sửa</Link> : null}
        {posting.status === 'DRAFT' ? <button className="button button-primary button-small" disabled={pending} onClick={() => changeStatus(publishPostingAction, 'Đăng tin tuyển dụng này ngay?')} type="button">{pending ? 'Đang xử lý…' : 'Đăng tin'}</button> : null}
        {posting.status === 'PUBLISHED' ? <button className="button button-quiet button-small close-posting-button" disabled={pending} onClick={() => changeStatus(closePostingAction, 'Đóng tin tuyển dụng này? Tin sẽ không nhận thêm hồ sơ.')} type="button">{pending ? 'Đang xử lý…' : 'Đóng tin'}</button> : null}
      </div>
      {error ? <p className="posting-action-error" role="alert">{error}</p> : null}
    </div>
  );
}
