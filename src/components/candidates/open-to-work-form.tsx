'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { setOpenToWorkAction } from '@/actions/talent';
import type { CandidateProfile } from '@/actions/types';

export function OpenToWorkForm({ profile }: { profile: CandidateProfile }) {
  const router = useRouter();
  const [openToWork, setOpenToWork] = useState(profile.openToWork);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const years = String(values.get('experienceYears') ?? '').trim();
    setPending(true);
    setError('');
    setSaved(false);
    try {
      const result = await setOpenToWorkAction({
        openToWork,
        location: String(values.get('location') ?? ''),
        experienceYears: years ? Number(years) : undefined,
      });
      if (!result.success) { setError(result.error); return; }
      setSaved(true);
      router.refresh();
    } catch {
      setError('Không thể lưu lúc này. Vui lòng thử lại.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="form-stack open-to-work-form" onSubmit={submit}>
      <label className="open-to-work-switch">
        <input checked={openToWork} onChange={(event) => { setOpenToWork(event.target.checked); setSaved(false); }} role="switch" type="checkbox" />
        <span aria-hidden="true" className="switch-track"><span className="switch-thumb" /></span>
        <span><strong>Sẵn sàng tìm việc</strong><small>Khi bật, nhà tuyển dụng có thể tìm thấy hồ sơ và CV online của bạn. Email và số điện thoại luôn được ẩn.</small></span>
      </label>
      <div className="open-to-work-fields">
        <label className="field-label">Địa điểm mong muốn <span className="field-optional">(tối đa 150 ký tự)</span><input className="text-input" defaultValue={profile.location ?? ''} maxLength={150} name="location" placeholder="Ví dụ: Hà Nội" /></label>
        <label className="field-label">Số năm kinh nghiệm<input className="text-input" defaultValue={profile.experienceYears ?? ''} inputMode="numeric" max={50} min={0} name="experienceYears" step={1} type="number" /></label>
      </div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <p aria-live="polite" className="form-success" role="status">{saved ? (openToWork ? 'Hồ sơ đang hiển thị với nhà tuyển dụng.' : 'Đã ẩn hồ sơ khỏi tìm kiếm của nhà tuyển dụng.') : ''}</p>
      <div className="posting-form-actions"><button className="button button-primary" disabled={pending} type="submit">{pending ? 'Đang lưu…' : 'Lưu cài đặt'}</button></div>
    </form>
  );
}
