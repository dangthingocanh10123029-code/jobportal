import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCompany } from '@/actions/companies';
import { companySizeLabels, employmentLabels, formatDate, formatSalary, industryLabels, jobLevelLabels } from '@/components/format';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const company = await getCompany(id);
  return company ? { title: `${company.name} — Job Portal`, description: company.about ?? `Tìm hiểu về ${company.name} và các vị trí đang tuyển dụng.` } : { title: 'Không tìm thấy công ty — Job Portal' };
}

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const company = await getCompany(id);
  if (!company) notFound();

  return (
    <main className="page-shell company-detail-page">
      <Link className="back-link" href="/companies">← Danh sách công ty</Link>
      <section className="surface-card company-detail-header">
        <img alt={`Logo ${company.name}`} className="company-detail-logo" height="112" src={company.logoUrl ?? '/images/company-placeholder.svg'} width="112" />
        <div className="company-detail-heading">
          <span className="eyebrow">Hồ sơ nhà tuyển dụng</span>
          <h1>{company.name}</h1>
          <div className="company-detail-facts">
            {company.size ? <span>{companySizeLabels[company.size]}</span> : null}
            {company.address ? <span>{company.address}</span> : null}
            {company.website ? <a href={company.website} rel="noopener" target="_blank">{company.website}<span aria-hidden="true"> ↗</span></a> : null}
          </div>
        </div>
      </section>
      {company.about ? <section aria-labelledby="company-about-title" className="surface-card company-about-card"><h2 id="company-about-title">Giới thiệu</h2><p>{company.about}</p></section> : null}
      <section aria-labelledby="company-open-postings-title" className="company-open-postings">
        <div className="page-heading"><span className="eyebrow">Cơ hội nghề nghiệp</span><h2 id="company-open-postings-title">Vị trí đang tuyển</h2><p>{company.openPostings.length} tin đang mở tại {company.name}.</p></div>
        {company.openPostings.length ? (
          <div className="company-open-posting-list">
            {company.openPostings.map((posting) => (
              <article className="surface-card company-open-posting-card" key={posting.id}>
                <img alt="" className="company-list-logo" height="56" src={posting.companyLogoUrl ?? company.logoUrl ?? '/images/company-placeholder.svg'} width="56" />
                <div className="company-open-posting-content">
                  <h3><Link href={`/jobs/${posting.id}`}>{posting.title}</Link></h3>
                  <p>{industryLabels[posting.industry]} · {jobLevelLabels[posting.level]} · {employmentLabels[posting.employmentType]}</p>
                  <div className="company-open-posting-meta"><span>{posting.location}</span><span>{formatSalary(posting.salaryMin, posting.salaryMax)}</span><span>Hạn nộp {formatDate(posting.applicationDeadline)}</span></div>
                </div>
                <Link aria-label={`Xem chi tiết: ${posting.title}`} className="posting-arrow" href={`/jobs/${posting.id}`}><span aria-hidden="true">→</span></Link>
              </article>
            ))}
          </div>
        ) : <div className="surface-card company-no-postings"><h3>Chưa có vị trí đang tuyển</h3><p>Các cơ hội mới của công ty sẽ được cập nhật tại đây.</p></div>}
      </section>
    </main>
  );
}
