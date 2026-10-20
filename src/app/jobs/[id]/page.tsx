import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCurrentProfile } from '@/actions/auth';
import { getMyApplicationForPosting } from '@/actions/applications';
import { getPostingDetail, getRelatedPostings } from '@/actions/postings';
import { getSavedPostingIds } from '@/actions/candidates';
import { getMyCv } from '@/actions/cv';
import { ApplicationForm } from '@/components/applications/application-form';
import { employmentLabels, formatDate, formatExperience, formatSalary, industryLabels, jobLevelLabels } from '@/components/format';
import { SavedPostingButton } from '@/components/candidates/saved-posting-button';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const posting = await getPostingDetail(id);
  return posting
    ? { title: `${posting.title} — Job Portal`, description: `${posting.title} tại ${posting.companyName}` }
    : { title: 'Không tìm thấy tin — Job Portal' };
}

export default async function PostingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [posting, profile] = await Promise.all([getPostingDetail(id), getCurrentProfile()]);
  if (!posting) notFound();
  const isCandidate = profile?.role === 'CANDIDATE';
  const canApply = posting.isOpen && isCandidate;
  const [relatedPostings, savedIds, application, onlineCv] = await Promise.all([
    getRelatedPostings(id),
    isCandidate ? getSavedPostingIds() : Promise.resolve([]),
    canApply ? getMyApplicationForPosting(id) : Promise.resolve(null),
    canApply ? getMyCv() : Promise.resolve(null),
  ]);

  return (
    <main className="page-shell posting-detail-page">
      <Link className="back-link" href="/">← Danh sách việc làm</Link>

      {!posting.isOpen ? (
        <section aria-live="polite" className="posting-closed-notice">
          <span aria-hidden="true">ⓘ</span>
          <div>
            <strong>Tin tuyển dụng này không còn nhận hồ sơ</strong>
            <p>{posting.displayStatus === 'CLOSED' ? 'Nhà tuyển dụng đã đóng tin.' : 'Đã hết hạn nộp hồ sơ.'}</p>
          </div>
        </section>
      ) : null}

      <div className="posting-detail-layout">
        <article className="surface-card posting-detail-card">
          <header className="posting-detail-header">
            <img alt="" className="company-placeholder company-placeholder-large" height="64" src={posting.companyLogoUrl ?? '/images/company-placeholder.svg'} width="64" />
            <div className="posting-detail-title">
              <span className="eyebrow">Cơ hội nghề nghiệp</span>
              <h1>{posting.title}{posting.featured ? <> <span className="featured-badge">Nổi bật</span></> : null}</h1>
              <p><Link href={`/companies/${posting.employerId}`}>{posting.companyName}{posting.companyVerified ? <span aria-label="Công ty đã xác minh" className="verified-check"> ✓</span> : null}</Link></p>
            </div>
            {profile?.role === 'CANDIDATE' ? <SavedPostingButton initialSaved={savedIds.includes(posting.id)} postingId={posting.id} /> : null}
          </header>

          <section aria-labelledby="description-title" className="posting-description">
            <h2 id="description-title">Mô tả công việc</h2>
            <p>{posting.description}</p>
          </section>

          {posting.requirements.trim() ? (
            <section aria-labelledby="requirements-title" className="posting-description">
              <h2 id="requirements-title">Yêu cầu</h2>
              <p>{posting.requirements}</p>
            </section>
          ) : null}
          {posting.benefits.trim() ? (
            <section aria-labelledby="benefits-title" className="posting-description">
              <h2 id="benefits-title">Quyền lợi</h2>
              <p>{posting.benefits}</p>
            </section>
          ) : null}
          {posting.skills.length ? (
            <section aria-labelledby="skills-title" className="posting-description">
              <h2 id="skills-title">Kỹ năng</h2>
              <div className="posting-skill-list">{posting.skills.map((skill) => <span className="skill-tag" key={skill}>{skill}</span>)}</div>
            </section>
          ) : null}
        </article>

        <aside aria-label="Thông tin và ứng tuyển" className="posting-detail-sidebar">
          <section aria-label="Thông tin tuyển dụng" className="surface-card posting-detail-meta">
          <div><span aria-hidden="true">▦</span><span><small>Ngành nghề</small><strong>{industryLabels[posting.industry]}</strong></span></div>
          <div><span aria-hidden="true">▤</span><span><small>Cấp bậc</small><strong>{jobLevelLabels[posting.level]}</strong></span></div>
          <div><span aria-hidden="true">◷</span><span><small>Kinh nghiệm</small><strong>{formatExperience(posting.experienceYears)}</strong></span></div>
          <div><span aria-hidden="true">♙</span><span><small>Số lượng tuyển</small><strong>{posting.headcount} người</strong></span></div>
          <div><span aria-hidden="true">⌖</span><span><small>Địa điểm</small><strong>{posting.location}</strong></span></div>
          <div><span aria-hidden="true">◷</span><span><small>Hình thức</small><strong>{employmentLabels[posting.employmentType]}</strong></span></div>
          <div><span aria-hidden="true">₫</span><span><small>Mức lương</small><strong>{formatSalary(posting.salaryMin, posting.salaryMax)}</strong></span></div>
          <div><span aria-hidden="true">▣</span><span><small>Hạn nộp</small><strong>{formatDate(posting.applicationDeadline, 'long')}</strong></span></div>
          </section>
          <section aria-label="Công ty tuyển dụng" className="surface-card posting-company-summary">
            <img alt="" height="52" src={posting.companyLogoUrl ?? '/images/company-placeholder.svg'} width="52" />
            <div><span className="eyebrow">Nhà tuyển dụng</span><Link href={`/companies/${posting.employerId}`}>{posting.companyName}{posting.companyVerified ? <span aria-label="Công ty đã xác minh" className="verified-check"> ✓</span> : null}</Link></div>
            <Link aria-label={`Xem công ty ${posting.companyName}`} className="company-summary-arrow" href={`/companies/${posting.employerId}`}>→</Link>
          </section>

        {posting.isOpen && profile?.role === 'CANDIDATE' ? (
          <section className="surface-card posting-detail-footer">
            {application ? (
              <div aria-live="polite" className="application-submitted">
                <span aria-hidden="true">✓</span>
                <div>
                  <strong>Đã nộp hồ sơ</strong>
                  <p>Hồ sơ ứng tuyển của bạn đã được gửi đến nhà tuyển dụng.</p>
                </div>
              </div>
            ) : <ApplicationForm hasOnlineCv={onlineCv !== null} postingId={posting.id} />}
          </section>
        ) : posting.isOpen && !profile ? (
          <section className="surface-card posting-detail-footer">
            <p>Quan tâm đến cơ hội này? Đăng nhập bằng tài khoản ứng viên để nộp hồ sơ.</p>
            <Link className="button button-primary" href={`/login?next=${encodeURIComponent(`/jobs/${posting.id}`)}`}>Đăng nhập để ứng tuyển</Link>
          </section>
        ) : null}
        </aside>
      </div>
      {relatedPostings.length ? (
        <section aria-labelledby="related-postings-title" className="related-postings">
          <div className="page-heading"><span className="eyebrow">Cùng lĩnh vực</span><h2 id="related-postings-title">Việc làm liên quan</h2></div>
          <div className="related-posting-list">
            {relatedPostings.map((related) => (
              <article className="surface-card related-posting-card" key={related.id}>
                <div>
                  <h3><Link href={`/jobs/${related.id}`} prefetch={false}>{related.title}</Link>{related.companyVerified ? <span aria-label="Công ty đã xác minh" className="verified-check"> ✓</span> : null}</h3>
                  <p><Link href={`/companies/${related.employerId}`} prefetch={false}>{related.companyName}</Link> · {industryLabels[related.industry]} · {jobLevelLabels[related.level]}</p>
                </div>
                <div className="posting-card-actions">{profile?.role === 'CANDIDATE' ? <SavedPostingButton initialSaved={savedIds.includes(related.id)} postingId={related.id} /> : null}<Link aria-label={`Xem chi tiết: ${related.title}`} className="posting-arrow" href={`/jobs/${related.id}`} prefetch={false}><span aria-hidden="true">→</span></Link></div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
