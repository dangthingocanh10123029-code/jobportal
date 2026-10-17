'use client';

import { useState } from 'react';
import { getApplicantProfile } from '@/actions/candidates';
import type { CandidateProfile } from '@/actions/types';

export function ApplicantProfileDetails({ applicationId }: { applicationId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [error, setError] = useState('');

  async function toggle() {
    if (open) { setOpen(false); return; }
    setOpen(true);
    if (profile) return;
    setLoading(true);
    setError('');
    try {
      const result = await getApplicantProfile(applicationId);
      if (result) setProfile(result);
      else setError('Không thể tải hồ sơ ứng viên.');
    } catch {
      setError('Không thể tải hồ sơ ứng viên. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  return <div className="applicant-profile-details"><button aria-expanded={open} className="button button-quiet button-small" onClick={toggle} type="button">{open ? 'Ẩn hồ sơ' : 'Xem hồ sơ'}</button>{open ? <section aria-label="Chi tiết hồ sơ ứng viên" className="applicant-profile-panel">{loading ? <p>Đang tải hồ sơ…</p> : error ? <p className="form-error" role="alert">{error}</p> : profile ? <><h3>Hồ sơ ứng viên</h3><div><strong>Kinh nghiệm</strong><p>{profile.experience?.trim() || 'Chưa cung cấp thông tin kinh nghiệm.'}</p></div><div><strong>Học vấn</strong><p>{profile.education?.trim() || 'Chưa cung cấp thông tin học vấn.'}</p></div></> : null}</section> : null}</div>;
}
