'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition, type FormEvent } from 'react';
import { setCompanyVerifiedAction, setPostingHiddenAction, setUserLockAction } from '@/actions/admin';

function useAdminAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  return { router, pending, startTransition, error, setError, success, setSuccess };
}

export function UserLockControl({ userId, locked }: { userId: string; locked: boolean }) {
  const state = useAdminAction();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!window.confirm(locked ? 'Mở khóa tài khoản này?' : 'Khóa tài khoản này?')) return;
    const reason = new FormData(event.currentTarget).get('reason')?.toString() ?? '';
    state.setError(''); state.setSuccess('');
    state.startTransition(async () => {
      try {
        const result = await setUserLockAction({ userId, locked: !locked, ...(locked ? {} : { reason }) });
        if (!result.success) { state.setError(result.error); return; }
        state.setSuccess(locked ? 'Đã mở khóa tài khoản.' : 'Đã khóa tài khoản.');
        state.router.refresh();
      } catch { state.setError('Không thể cập nhật tài khoản. Vui lòng thử lại.'); }
    });
  }
  return <form className="admin-inline-action" onSubmit={submit}>
    {!locked ? <label className="admin-reason-field"><span>Lý do khóa</span><textarea maxLength={500} minLength={5} name="reason" placeholder="Nêu lý do (5–500 ký tự)" required rows={2} /></label> : null}
    <button className={`button button-small ${locked ? 'button-primary' : 'button-danger'}`} disabled={state.pending} type="submit">{state.pending ? 'Đang xử lý…' : locked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}</button>
    {state.error ? <p className="admin-action-message is-error" role="alert">{state.error}</p> : null}
    {state.success ? <p className="admin-action-message" role="status">{state.success}</p> : null}
  </form>;
}

export function PostingModerationControl({ postingId, hidden }: { postingId: string; hidden: boolean }) {
  const state = useAdminAction();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!window.confirm(hidden ? 'Bỏ ẩn tin tuyển dụng này?' : 'Ẩn tin tuyển dụng này?')) return;
    const reason = new FormData(event.currentTarget).get('reason')?.toString() ?? '';
    state.setError(''); state.setSuccess('');
    state.startTransition(async () => {
      try {
        const result = await setPostingHiddenAction({ postingId, hidden: !hidden, ...(hidden ? {} : { reason }) });
        if (!result.success) { state.setError(result.error); return; }
        state.setSuccess(hidden ? 'Tin đã được bỏ ẩn.' : 'Tin đã được ẩn và nhà tuyển dụng đã nhận thông báo.');
        state.router.refresh();
      } catch { state.setError('Không thể cập nhật tin tuyển dụng. Vui lòng thử lại.'); }
    });
  }
  return <form className="admin-inline-action" onSubmit={submit}>
    {!hidden ? <label className="admin-reason-field"><span>Lý do ẩn</span><textarea maxLength={500} minLength={5} name="reason" placeholder="Lý do hiển thị trong thông báo cho nhà tuyển dụng" required rows={2} /></label> : null}
    <button className={`button button-small ${hidden ? 'button-primary' : 'button-danger'}`} disabled={state.pending} type="submit">{state.pending ? 'Đang xử lý…' : hidden ? 'Bỏ ẩn tin' : 'Ẩn tin'}</button>
    {state.error ? <p className="admin-action-message is-error" role="alert">{state.error}</p> : null}
    {state.success ? <p className="admin-action-message" role="status">{state.success}</p> : null}
  </form>;
}

export function CompanyVerificationControl({ companyId, verified }: { companyId: string; verified: boolean }) {
  const state = useAdminAction();
  function submit() {
    if (!window.confirm(verified ? 'Bỏ xác minh công ty này?' : 'Xác minh công ty này?')) return;
    state.setError(''); state.setSuccess('');
    state.startTransition(async () => {
      try {
        const result = await setCompanyVerifiedAction({ companyId, verified: !verified });
        if (!result.success) { state.setError(result.error); return; }
        state.setSuccess(verified ? 'Đã bỏ xác minh công ty.' : 'Đã xác minh công ty.');
        state.router.refresh();
      } catch { state.setError('Không thể cập nhật xác minh công ty. Vui lòng thử lại.'); }
    });
  }
  return <div className="admin-inline-action">
    <button className={`button button-small ${verified ? 'button-quiet' : 'button-primary'}`} disabled={state.pending} onClick={submit} type="button">{state.pending ? 'Đang xử lý…' : verified ? 'Bỏ xác minh' : 'Xác minh công ty'}</button>
    {state.error ? <p className="admin-action-message is-error" role="alert">{state.error}</p> : null}
    {state.success ? <p className="admin-action-message" role="status">{state.success}</p> : null}
  </div>;
}
