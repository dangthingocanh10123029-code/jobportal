'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { updateCandidateProfileAction } from '@/actions/candidates';
import type { CandidateProfile } from '@/actions/types';
import { SkillsTagInput } from '@/components/postings/skills-tag-input';

export function CandidateProfileForm({ profile }: { profile: CandidateProfile }) {
  const router = useRouter();
  const [skills, setSkills] = useState(profile.skills);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setPending(true);
    setError('');
    setSaved(false);
    try {
      const result = await updateCandidateProfileAction({
        headline: String(values.get('headline') ?? '').trim(),
        skills,
        experience: String(values.get('experience') ?? '').trim(),
        education: String(values.get('education') ?? '').trim(),
      });
      if (!result.success) { setError(result.error); return; }
      setSaved(true);
      router.refresh();
    } catch {
      setError('Không thể lưu hồ sơ lúc này. Vui lòng thử lại.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="form-stack candidate-profile-form" onSubmit={submit}>
      <div className="candidate-profile-identity"><strong>{profile.fullName}</strong><span>{profile.phone || 'Chưa cung cấp số điện thoại'}</span></div>
      <label className="field-label">Tiêu đề hồ sơ <span className="field-optional">(tối đa 150 ký tự)</span><input className="text-input" defaultValue={profile.headline ?? ''} maxLength={150} name="headline" placeholder="Ví dụ: Chuyên viên Marketing với 5 năm kinh nghiệm" /></label>
      <div className="field-label skills-field">Kỹ năng <SkillsTagInput onChange={setSkills} skills={skills} /></div>
      <label className="field-label">Kinh nghiệm <span className="field-optional">(tối đa 5000 ký tự)</span><textarea className="text-input textarea-input" defaultValue={profile.experience ?? ''} maxLength={5000} name="experience" placeholder="Chia sẻ vai trò, thành tựu và kinh nghiệm làm việc…" rows={7} /></label>
      <label className="field-label">Học vấn <span className="field-optional">(tối đa 5000 ký tự)</span><textarea className="text-input textarea-input" defaultValue={profile.education ?? ''} maxLength={5000} name="education" placeholder="Trường học, chuyên ngành, bằng cấp…" rows={5} /></label>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {saved ? <p className="form-success" role="status">Đã cập nhật hồ sơ.</p> : null}
      <div className="posting-form-actions"><button className="button button-primary" disabled={pending} type="submit">{pending ? 'Đang lưu…' : 'Lưu hồ sơ'}</button></div>
    </form>
  );
}
