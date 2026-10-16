'use client';

import { useState, type FormEvent } from 'react';
import { updateProfileAction } from '@/actions/auth';
import type { Profile } from '@/actions/types';

export function ProfileForm({ profile }: { profile: Profile }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setPending(true);
    setMessage('');
    setError('');

    const result = await updateProfileAction({
      ...(profile.role === 'CANDIDATE' ? { fullName: String(formData.get('fullName') ?? '') } : {}),
      ...(profile.role === 'CANDIDATE' ? { phone: String(formData.get('phone') ?? '') } : {}),
      ...(profile.role === 'EMPLOYER' ? { companyName: String(formData.get('companyName') ?? '') } : {}),
    });

    setPending(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setMessage('Thông tin hồ sơ đã được cập nhật.');
  }

  return (
    <form className="form-stack profile-form" onSubmit={handleSubmit}>
      {profile.role === 'CANDIDATE' ? (
        <>
          <label className="field-label">Họ và tên<input className="text-input" defaultValue={profile.fullName ?? ''} name="fullName" required /></label>
          <label className="field-label">Số điện thoại<input autoComplete="tel" className="text-input" defaultValue={profile.phone ?? ''} name="phone" placeholder="090 123 4567" type="tel" /></label>
        </>
      ) : (
        <label className="field-label">Tên công ty<input autoComplete="organization" className="text-input" defaultValue={profile.companyName ?? ''} name="companyName" required /></label>
      )}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {message ? <p className="form-success" role="status">{message}</p> : null}
      <button className="button button-primary" disabled={pending} type="submit">{pending ? 'Đang lưu…' : 'Lưu thay đổi'}</button>
    </form>
  );
}
