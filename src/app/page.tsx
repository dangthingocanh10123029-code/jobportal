import Link from 'next/link';
import { listOpenPostings } from '@/actions/postings';
import { getSavedPostingIds } from '@/actions/candidates';
import { getCurrentProfile } from '@/actions/auth';
import { searchFilterSchema } from '@/actions/postings-schema';
import type { Industry, PostingSort, PostingSummary, SearchFilter } from '@/actions/types';
import { employmentLabels, formatDate, formatExperience, formatSalary, industryLabels, jobLevelLabels, postingSortLabels } from '@/components/format';
import { SavedPostingButton } from '@/components/candidates/saved-posting-button';
import { Button, Input } from '@/components/ui/primitives';

function PostingCard({ posting, savedIds, isCandidate }: { posting: PostingSummary; savedIds: string[]; isCandidate: boolean }) {
  return (
    <article className={`public-posting-card${posting.featured ? ' is-featured' : ''}`}>
      <img alt="" className="company-placeholder" height="48" src={posting.companyLogoUrl ?? '/images/company-placeholder.svg'} width="48" />
      <div className="public-posting-content">
        <div className="public-posting-heading">
          <div>
            <h3><Link href={`/jobs/${posting.id}`} prefetch={false}>{posting.title}</Link></h3>
            <p className="public-posting-company"><Link href={`/companies/${posting.employerId}`} prefetch={false}>{posting.companyName}{posting.companyVerified ? <span aria-label="Công ty đã xác minh" className="verified-check"> ✓</span> : null}</Link></p>
          </div>
          <span className="posting-badges">{posting.featured ? <span className="featured-badge">Nổi bật</span> : null}<span className="employment-badge">{employmentLabels[posting.employmentType]}</span></span>
        </div>
        <div className="public-posting-meta">
          <span>{industryLabels[posting.industry]}</span>
          <span>{jobLevelLabels[posting.level]}</span>
          <span>{formatExperience(posting.experienceYears)}</span>
          <span><span aria-hidden="true">⌖</span> {posting.location}</span>
          <span><span aria-hidden="true">◷</span> {formatSalary(posting.salaryMin, posting.salaryMax)}</span>
          <span>Hạn nộp {formatDate(posting.applicationDeadline)}</span>
        </div>
        {posting.skills.length ? <div aria-label="Kỹ năng" className="posting-skill-list">{posting.skills.slice(0, 3).map((skill) => <span className="skill-tag" key={skill}>{skill}</span>)}</div> : null}
      </div>
      <div className="posting-card-actions">{isCandidate ? <SavedPostingButton initialSaved={savedIds.includes(posting.id)} postingId={posting.id} /> : null}<Link aria-label={`Xem chi tiết: ${posting.title}`} className="posting-arrow" href={`/jobs/${posting.id}`} prefetch={false}><span aria-hidden="true">→</span></Link></div>
    </article>
  );
}

type HomeSearchParams = Record<string, string | string[] | undefined>;

function searchFilterFromParams(params: HomeSearchParams): SearchFilter {
  const firstValues = Object.fromEntries(
    Object.entries(params).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  );
  return searchFilterSchema.parse({ ...firstValues, employmentType: firstValues.type, maxExperience: firstValues.exp });
}

function searchHref(filter: SearchFilter, page: number) {
  const params = new URLSearchParams();
  if (filter.q) params.set('q', filter.q);
  if (filter.location) params.set('location', filter.location);
  if (filter.employmentType) params.set('type', filter.employmentType);
  if (filter.minSalary) params.set('minSalary', String(filter.minSalary));
  if (filter.industry) params.set('industry', filter.industry);
  if (filter.level) params.set('level', filter.level);
  if (filter.maxExperience !== undefined) params.set('exp', String(filter.maxExperience));
  if (filter.skill) params.set('skill', filter.skill);
  if (filter.sort) params.set('sort', filter.sort);
  params.set('page', String(page));
  return `/?${params.toString()}`;
}

function industryHref(filter: SearchFilter, industry?: Industry) {
  const href = new URLSearchParams(searchHref(filter, 1).split('?')[1]);
  if (industry) href.set('industry', industry);
  else href.delete('industry');
  href.delete('page');
  return `/?${href.toString()}`;
}

function PageNavigation({ page, pageCount, filter }: { page: number; pageCount: number; filter: SearchFilter }) {
  if (pageCount <= 1) return null;

  return (
    <nav aria-label="Phân trang tin tuyển dụng" className="pagination">
      {page > 1 ? <Link className="pagination-link" href={searchHref(filter, page - 1)}>← Trang trước</Link> : <span />}
      <span className="pagination-count">Trang {page} / {pageCount}</span>
      {page < pageCount ? <Link className="pagination-link" href={searchHref(filter, page + 1)}>Trang sau →</Link> : <span />}
    </nav>
  );
}

export default async function HomePage({ searchParams }: { searchParams: Promise<HomeSearchParams> }) {
  const filter = searchFilterFromParams(await searchParams);
  const [postingsPage, savedIds, profile] = await Promise.all([listOpenPostings(filter), getSavedPostingIds(), getCurrentProfile()]);
  const isCandidate = profile?.role === 'CANDIDATE';
  const pageCount = Math.max(1, Math.ceil(postingsPage.total / postingsPage.pageSize));
  const hasFilters = Boolean(filter.q || filter.location || filter.employmentType || filter.minSalary || filter.industry || filter.level || filter.maxExperience !== undefined || filter.skill || (filter.sort && filter.sort !== 'newest'));
  // 'newest' lists featured postings first, so the unfiltered first page already holds the block's ≤ 6.
  const featured = !hasFilters && postingsPage.page === 1 ? postingsPage.items.filter((p) => p.featured).slice(0, 6) : [];

  return (
    <main>
      <section aria-labelledby="home-title" className="home-hero">
        <div className="home-hero-image" />
        <div className="home-hero-content">
          <span className="eyebrow">Cơ hội mới mỗi ngày</span>
          <h1 id="home-title">Tìm công việc phù hợp với bạn</h1>
          <p>Khám phá những vị trí đang tuyển dụng từ các công ty trên khắp Việt Nam.</p>
          <a className="button button-primary" href="#job-search">Khám phá việc làm <span aria-hidden="true">↓</span></a>
        </div>
      </section>

      <section aria-labelledby="open-postings" className="page-shell home-listings">
        <nav aria-label="Lọc theo ngành nghề" className="industry-chips">
          <Link aria-current={!filter.industry ? 'page' : undefined} className={`industry-chip${!filter.industry ? ' selected' : ''}`} href={industryHref(filter)}>
            Tất cả ngành
          </Link>
          {(Object.keys(industryLabels) as Industry[]).map((industry) => (
            <Link aria-current={filter.industry === industry ? 'page' : undefined} className={`industry-chip${filter.industry === industry ? ' selected' : ''}`} href={industryHref(filter, industry)} key={industry}>
              <img alt="" height="20" src={`/images/industries/${industry.toLowerCase()}.svg`} width="20" />
              {industryLabels[industry]}
            </Link>
          ))}
        </nav>
        <form action="/" className="job-search-form" id="job-search" method="get">
          <label className="job-search-keyword field-label" htmlFor="search-keyword">
            Từ khóa
            <Input autoComplete="off" defaultValue={filter.q ?? ''} id="search-keyword" name="q" placeholder="Ví dụ: kế toán, thiết kế..." type="search" />
          </label>
          <label className="field-label" htmlFor="search-location">
            Địa điểm
            <input className="text-input" defaultValue={filter.location ?? ''} id="search-location" name="location" placeholder="Ví dụ: Hà Nội" type="search" />
          </label>
          <label className="field-label" htmlFor="search-employment-type">
            Hình thức
            <select className="text-input select-input" defaultValue={filter.employmentType ?? ''} id="search-employment-type" name="type">
              <option value="">Tất cả hình thức</option>
              {Object.entries(employmentLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <details className="advanced-search">
          <summary>Bộ lọc nâng cao <span aria-hidden="true">⌄</span></summary>
          <div className="advanced-search-fields">
          <label className="field-label" htmlFor="search-min-salary">
            Lương tối thiểu
            <span className="salary-search-input">
              <input className="text-input" defaultValue={filter.minSalary ?? ''} id="search-min-salary" min="1" name="minSalary" placeholder="Tùy chọn" step="1" type="number" />
              <span>₫ / tháng</span>
            </span>
          </label>
          <label className="field-label" htmlFor="search-industry">
            Ngành nghề
            <select className="text-input select-input" defaultValue={filter.industry ?? ''} id="search-industry" name="industry">
              <option value="">Tất cả ngành</option>
              {Object.entries(industryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="field-label" htmlFor="search-level">
            Cấp bậc
            <select className="text-input select-input" defaultValue={filter.level ?? ''} id="search-level" name="level">
              <option value="">Tất cả cấp bậc</option>
              {Object.entries(jobLevelLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="field-label" htmlFor="search-experience">
            Kinh nghiệm tối đa
            <span className="salary-search-input"><input className="text-input" defaultValue={filter.maxExperience ?? ''} id="search-experience" max="20" min="0" name="exp" placeholder="Không giới hạn" type="number" /><span>năm</span></span>
          </label>
          <label className="field-label" htmlFor="search-skill">
            Kỹ năng
            <input className="text-input" defaultValue={filter.skill ?? ''} id="search-skill" name="skill" placeholder="Ví dụ: Excel" type="search" />
          </label>
          <label className="field-label" htmlFor="search-sort">
            Sắp xếp
            <select className="text-input select-input" defaultValue={filter.sort ?? 'newest'} id="search-sort" name="sort">
              {(Object.entries(postingSortLabels) as [PostingSort, string][]).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          </div>
          </details>
          <div className="job-search-actions">
            <Button type="submit">Tìm việc</Button>
            {hasFilters ? <Link className="clear-search-link" href="/">Xóa bộ lọc</Link> : null}
          </div>
        </form>

        {featured.length ? (
          <section aria-labelledby="featured-postings" className="featured-postings">
            <div className="page-heading">
              <span className="eyebrow">Được nhà tuyển dụng đẩy tin</span>
              <h2 id="featured-postings">Việc làm nổi bật</h2>
            </div>
            <div className="featured-posting-grid">
              {featured.map((posting) => (
                <Link className="featured-posting-card" href={`/jobs/${posting.id}`} key={posting.id} prefetch={false}>
                  <img alt="" className="company-placeholder" height="40" src={posting.companyLogoUrl ?? '/images/company-placeholder.svg'} width="40" />
                  <span className="featured-posting-copy"><strong>{posting.title}</strong><small>{posting.companyName}</small><small>{posting.location} · {formatSalary(posting.salaryMin, posting.salaryMax)}</small></span>
                  <span className="featured-badge">Nổi bật</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <div className="home-listings-heading">
          <div className="page-heading">
            <span className="eyebrow">Việc làm đang mở</span>
            <h2 id="open-postings">Cơ hội dành cho bạn</h2>
            <p>{postingsPage.total} {hasFilters ? 'kết quả phù hợp với bộ lọc của bạn.' : 'vị trí đang chờ ứng viên phù hợp.'}</p>
          </div>
          <span className="results-count">{postingsPage.total} việc làm</span>
        </div>

        {postingsPage.items.length > 0 ? (
          <div aria-label="Danh sách việc làm đang mở" className="public-posting-list">
            {postingsPage.items.map((posting) => <PostingCard isCandidate={isCandidate} key={posting.id} posting={posting} savedIds={savedIds} />)}
          </div>
        ) : (
          <div className="surface-card public-empty-state">
            <img alt="" height="180" src="/images/empty-search.svg" width="240" />
            <h3>{hasFilters ? 'Không tìm thấy tin phù hợp' : 'Chưa có tin tuyển dụng đang mở'}</h3>
            <p>{hasFilters ? 'Thử thay đổi từ khóa hoặc bộ lọc để xem thêm cơ hội.' : 'Các cơ hội mới sẽ được cập nhật tại đây. Hãy quay lại sau nhé.'}</p>
          </div>
        )}

        <PageNavigation filter={filter} page={postingsPage.page} pageCount={pageCount} />
      </section>
    </main>
  );
}
