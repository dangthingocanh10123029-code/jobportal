import Link from 'next/link';
import { notFound } from 'next/navigation';
import { listMyPostings } from '@/actions/postings';
import { getTalent } from '@/actions/talent';
import { CvDocument } from '@/components/cv/cv-document';
import { avatarFor } from '@/components/avatar';
import { InviteTalentForm, SaveTalentForm } from '@/components/talent/talent-actions';

export const metadata = { title: 'Hồ sơ ứng viên — Job Portal' };

export default async function TalentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [talent, postings] = await Promise.all([getTalent(id), listMyPostings()]);
  if (!talent) notFound();
  const openPostings = postings.filter((posting) => posting.displayStatus === 'PUBLISHED').map(({ id, title }) => ({ id, title }));
  const { profile } = talent;

  return (
    <main className="page-shell talent-detail-page">
      <Link className="back-link" href="/employer/talent">← Tìm ứng viên</Link>
      <div className="talent-detail-layout">
        <div className="talent-detail-main">
          <section aria-label="Hồ sơ ứng viên" className="surface-card talent-profile-card">
            <div className="talent-card-head">
              <img alt="" className="talent-avatar" height="46" src={avatarFor(talent.candidateId)} width="46" />
              <div><h1>{talent.fullName}</h1><p>{talent.headline || 'Chưa có tiêu đề hồ sơ'}</p></div>
            </div>
            <div className="posting-meta">
              <span><span aria-hidden="true">⌖</span> {talent.location || 'Chưa cập nhật địa điểm'}</span>
              <span>{talent.experienceYears === null ? 'Chưa cập nhật kinh nghiệm' : talent.experienceYears === 0 ? 'Chưa có kinh nghiệm' : `${talent.experienceYears} năm kinh nghiệm`}</span>
            </div>
            {profile.skills.length ? <ul aria-label="Kỹ năng" className="talent-skills">{profile.skills.map((skill) => <li className="skill-tag" key={skill}>{skill}</li>)}</ul> : null}
            <div className="talent-profile-section"><h2>Kinh nghiệm</h2><p>{profile.experience?.trim() || 'Chưa cung cấp thông tin kinh nghiệm.'}</p></div>
            <div className="talent-profile-section"><h2>Học vấn</h2><p>{profile.education?.trim() || 'Chưa cung cấp thông tin học vấn.'}</p></div>
            <p className="field-hint">Email và số điện thoại của ứng viên được ẩn. Hãy gửi lời mời ứng tuyển để kết nối.</p>
          </section>
          {talent.cv ? <section aria-label="CV online" className="talent-cv"><h2>CV online</h2><CvDocument cv={talent.cv} /></section> : null}
        </div>
        <aside aria-label="Thao tác với ứng viên" className="talent-detail-side">
          <section className="surface-card"><SaveTalentForm candidateId={talent.candidateId} initialSaved={talent.saved} /></section>
          <section className="surface-card"><InviteTalentForm candidateId={talent.candidateId} postings={openPostings} /></section>
        </aside>
      </div>
    </main>
  );
}
