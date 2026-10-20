import type { CvItem, OnlineCv } from '@/actions/types';

export type CvContent = Omit<OnlineCv, 'candidateId' | 'updatedAt'>;

const monthLabel = (value: string) => {
  const [year, month] = value.split('-');
  return month ? `${month}/${year}` : value;
};

function CvItems({ title, items }: { title: string; items: CvItem[] }) {
  if (!items.length) return null;
  return (
    <section className="cv-section">
      <h3>{title}</h3>
      {items.map((item, index) => (
        <div className="cv-item" key={index}>
          <div className="cv-item-head">
            <strong>{item.title || '—'}</strong>
            <span>{item.startDate ? monthLabel(item.startDate) : '…'} – {item.endDate ? monthLabel(item.endDate) : 'Hiện tại'}</span>
          </div>
          <p className="cv-item-org">{item.organization}</p>
          {item.description ? <p className="cv-item-desc">{item.description}</p> : null}
        </div>
      ))}
    </section>
  );
}

/** Read-only CV render shared by the editor preview, the print page and the Employer snapshot view. */
/** email/phone optional: the Employer talent view never receives them. */
export function CvDocument({ cv }: { cv: Omit<CvContent, 'email' | 'phone'> & Partial<Pick<CvContent, 'email' | 'phone'>> }) {
  const contacts = [cv.email, cv.phone, cv.location].filter(Boolean);
  return (
    <article aria-label={`CV của ${cv.fullName || 'ứng viên'}`} className={`cv-document cv-${cv.template.toLowerCase()}`}>
      <header className="cv-header">
        <h2>{cv.fullName || 'Họ và tên'}</h2>
        {cv.headline ? <p className="cv-headline">{cv.headline}</p> : null}
        {contacts.length ? <p className="cv-contacts">{contacts.join(' · ')}</p> : null}
      </header>
      {cv.summary ? <section className="cv-section"><h3>Giới thiệu</h3><p className="cv-item-desc">{cv.summary}</p></section> : null}
      <CvItems items={cv.experiences} title="Kinh nghiệm làm việc" />
      <CvItems items={cv.educations} title="Học vấn" />
      {cv.skills.length ? <section className="cv-section"><h3>Kỹ năng</h3><ul className="cv-tags">{cv.skills.map((skill) => <li key={skill}>{skill}</li>)}</ul></section> : null}
      {cv.languages.length ? <section className="cv-section"><h3>Ngoại ngữ</h3><ul className="cv-tags">{cv.languages.map((language) => <li key={language}>{language}</li>)}</ul></section> : null}
      {cv.certifications.length ? (
        <section className="cv-section">
          <h3>Chứng chỉ</h3>
          <ul className="cv-certs">
            {cv.certifications.map((cert, index) => <li key={index}><strong>{cert.name || '—'}</strong>{[cert.issuer, cert.year].filter(Boolean).length ? ` — ${[cert.issuer, cert.year].filter(Boolean).join(', ')}` : ''}</li>)}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
