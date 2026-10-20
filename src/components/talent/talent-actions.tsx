'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { inviteTalentAction, toggleSavedTalentAction } from '@/actions/talent';

export function SaveTalentForm({ candidateId, initialSaved }: { candidateId: string; initialSaved: boolean }) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const note = saved ? undefined : String(new FormData(event.currentTarget).get('note') ?? '');
    setPending(true);
    setError('');
    setStatus('');
    try {
      const result = await toggleSavedTalentAction({ candidateId, note });
      if (!result.success) { setError(result.error); return; }
      setSaved(result.data.saved);
      setStatus(result.data.saved ? 'Đã lưu ứng viên.' : 'Đã bỏ lưu ứng viên.');
      router.refresh();
    } catch {
      setError('Không thể cập nhật lúc này. Vui lòng thử lại.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="form-stack talent-side-form" onSubmit={submit}>
      <h2>Lưu ứng viên</h2>
      {saved ? <p className="field-hint">Ứng viên đã nằm trong danh sách đã lưu của bạn.</p> : <label className="field-label">Ghi chú riêng <span className="field-optional">(tối đa 500 ký tự)</span><textarea className="text-input textarea-input" maxLength={500} name="note" placeholder="Chỉ bạn nhìn thấy ghi chú này" rows={3} /></label>}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <p aria-live="polite" className="form-success" role="status">{status}</p>
      <button className={`button ${saved ? 'button-quiet' : 'button-primary'}`} disabled={pending} type="submit">{pending ? 'Đang lưu…' : saved ? 'Bỏ lưu' : 'Lưu ứng viên'}</button>
    </form>
  );
}

export function InviteTalentForm({ candidateId, postings }: { candidateId: string; postings: { id: string; title: string }[] }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setPending(true);
    setError('');
    setStatus('');
    try {
      const result = await inviteTalentAction({ candidateId, postingId: String(values.get('postingId') ?? ''), message: String(values.get('message') ?? '') });
      if (!result.success) { setError(result.error); return; }
      form.reset();
      setStatus('Đã gửi lời mời ứng tuyển. Ứng viên sẽ nhận được thông báo.');
    } catch {
      setError('Không thể gửi lời mời lúc này. Vui lòng thử lại.');
    } finally {
      setPending(false);
    }
  }

  if (!postings.length) {
    return <div className="form-stack talent-side-form"><h2>Mời ứng tuyển</h2><p className="field-hint">Bạn chưa có tin tuyển dụng nào đang mở.</p><Link className="button button-quiet" href="/employer/postings/new">Đăng tin mới</Link></div>;
  }

  return (
    <form className="form-stack talent-side-form" onSubmit={submit}>
      <h2>Mời ứng tuyển</h2>
      <label className="field-label">Tin tuyển dụng<select className="text-input select-input" name="postingId" required>{postings.map((posting) => <option key={posting.id} value={posting.id}>{posting.title}</option>)}</select></label>
      <label className="field-label">Lời nhắn <span className="field-optional">(tối đa 1000 ký tự)</span><textarea className="text-input textarea-input" maxLength={1000} name="message" placeholder="Giới thiệu ngắn về vị trí và lý do bạn quan tâm" rows={4} /></label>
      <p className="field-hint">Mỗi tin chỉ mời một ứng viên một lần; tối đa 20 lời mời trong 24 giờ.</p>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <p aria-live="polite" className="form-success" role="status">{status}</p>
      <button className="button button-primary" disabled={pending} type="submit">{pending ? 'Đang gửi…' : 'Gửi lời mời'}</button>
    </form>
  );
}
