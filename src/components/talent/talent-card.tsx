import Link from 'next/link';
import type { TalentSummary } from '@/actions/types';
import { formatDate } from '@/components/format';
import { avatarFor } from '@/components/avatar';
import { MapPin } from 'lucide-react';
import { icon } from '@/components/ui/primitives';

export function TalentCard({ talent }: { talent: TalentSummary }) {
  return (
    <article className="surface-card talent-card">
      <div className="talent-card-head">
        <img alt="" className="talent-avatar" height="46" src={avatarFor(talent.candidateId)} width="46" />
        <div>
          <h2><Link href={`/employer/talent/${talent.candidateId}`} prefetch={false}>{talent.fullName}</Link></h2>
          <p>{talent.headline || 'Chưa có tiêu đề hồ sơ'}</p>
        </div>
        {talent.saved ? <span className="ui-badge ui-badge-info">Đã lưu</span> : null}
      </div>
      <div className="posting-meta">
        <span><MapPin {...icon} />{talent.location || 'Chưa cập nhật địa điểm'}</span>
        <span>{talent.experienceYears === null ? 'Chưa cập nhật kinh nghiệm' : talent.experienceYears === 0 ? 'Chưa có kinh nghiệm' : `${talent.experienceYears} năm kinh nghiệm`}</span>
        {talent.hasOnlineCv ? <span className="ui-badge ui-badge-success">CV online</span> : null}
      </div>
      {talent.skills.length ? <ul aria-label="Kỹ năng" className="talent-skills">{talent.skills.slice(0, 8).map((skill) => <li className="skill-tag" key={skill}>{skill}</li>)}</ul> : null}
      <p className="field-hint">Cập nhật {formatDate(talent.updatedAt)}</p>
    </article>
  );
}
