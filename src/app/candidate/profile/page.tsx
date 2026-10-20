import { notFound } from 'next/navigation';
import { getMyCandidateProfile } from '@/actions/candidates';
import { CandidateProfileForm } from '@/components/candidates/candidate-profile-form';
import { OpenToWorkForm } from '@/components/candidates/open-to-work-form';

export default async function CandidateProfilePage() {
  const profile = await getMyCandidateProfile();
  if (!profile) notFound();

  return <main className="page-shell candidate-profile-page"><div className="page-heading"><span className="eyebrow">Hồ sơ ứng viên</span><h1>Hồ sơ của tôi</h1><p>Giúp nhà tuyển dụng hiểu rõ hơn về kinh nghiệm và thế mạnh của bạn.</p></div><section aria-label="Hiển thị với nhà tuyển dụng" className="surface-card candidate-profile-card open-to-work-card"><OpenToWorkForm profile={profile} /></section><section aria-label="Thông tin hồ sơ ứng viên" className="surface-card candidate-profile-card"><CandidateProfileForm profile={profile} /></section></main>;
}
