import Link from 'next/link';
import { listSavedPostings } from '@/actions/candidates';
import { SavedPostingButton } from '@/components/candidates/saved-posting-button';
import { employmentLabels, formatDate, formatSalary, industryLabels, jobLevelLabels } from '@/components/format';

export default async function SavedPostingsPage() {
  const postings = await listSavedPostings();
  return (
    <main className="page-shell candidate-saved-page">
      <div className="page-heading"><span className="eyebrow">Danh sách của bạn</span><h1>Việc đã lưu</h1><p>{postings.length} tin tuyển dụng bạn muốn xem lại.</p></div>
      {postings.length ? <div aria-label="Danh sách việc làm đã lưu" className="saved-posting-list">{postings.map((posting) => <article className={`surface-card saved-posting-card${posting.isOpen ? '' : ' is-closed'}`} key={posting.id}>
        <img alt="" className="company-placeholder" height="56" src={posting.companyLogoUrl ?? '/images/company-placeholder.svg'} width="56" />
        <div className="saved-posting-content"><div className="saved-posting-heading"><h2><Link href={`/jobs/${posting.id}`}>{posting.title}</Link></h2>{posting.isOpen ? null : <span className="posting-availability-badge">{new Date(posting.applicationDeadline).getTime() < Date.now() ? 'Đã hết hạn' : 'Đã đóng'}</span>}</div><p><Link href={`/companies/${posting.employerId}`}>{posting.companyName}</Link></p><div className="saved-posting-meta"><span>{industryLabels[posting.industry]}</span><span>{jobLevelLabels[posting.level]}</span><span>{employmentLabels[posting.employmentType]}</span><span>{posting.location}</span><span>{formatSalary(posting.salaryMin, posting.salaryMax)}</span><span>Hạn nộp {formatDate(posting.applicationDeadline)}</span></div></div>
        <SavedPostingButton initialSaved postingId={posting.id} />
      </article>)}</div> : <section className="surface-card candidate-saved-empty"><img alt="" height="180" src="/images/empty-saved.svg" width="240" /><h2>Chưa có việc làm đã lưu</h2><p>Lưu những tin bạn quan tâm để dễ dàng xem lại sau.</p><Link className="button button-primary" href="/">Khám phá việc làm</Link></section>}
    </main>
  );
}
