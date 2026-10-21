import { Suspense } from 'react';
import Link from 'next/link';
import { listOpenPostings } from '@/actions/postings';
import { getSavedPostingIds } from '@/actions/candidates';
import { listCompanies } from '@/actions/companies';
import { getCurrentProfile } from '@/actions/auth';
import { getRecommendedPostings, listJobAlerts } from '@/actions/alerts';
import { searchFilterSchema } from '@/actions/postings-schema';
import type { PostingSort, PostingSummary, SearchFilter } from '@/actions/types';
import { employmentLabels, formatDate, formatPostedAgo, formatSalary, industryLabels, jobLevelLabels, postingSortLabels } from '@/components/format';
import { SavedPostingButton } from '@/components/candidates/saved-posting-button';
import { CreateAlertButton } from '@/components/alerts/create-alert-button';
import { alertFilterFromSearch } from '@/components/alerts/describe';
import { CompaniesAndStories, HomeFaq, HowItWorks, LatestArticles } from '@/components/home/home-sections';
import { EmployerCTA } from '@/components/home/employer-cta';
import { FreshCarousel } from '@/components/home/fresh-carousel';
import { HeroBanner } from '@/components/home/hero-banner';
import { LogoStrip } from '@/components/home/logo-strip';
import { HomeAlertForm } from '@/components/home/home-alert-form';
import { SalaryRange } from '@/components/home/salary-range';
import { Button, FeaturedBadge, icon, iconLg, Input, VerifiedCheck } from '@/components/ui/primitives';
import { ArrowRight, BellRing, Briefcase, CalendarClock, Check, Clock, Layers, MapPin, Plus, Search, Sparkles, Wallet } from 'lucide-react';

function PostingCard({ posting, savedIds, isCandidate, matchReasons }: { posting: PostingSummary; savedIds: string[]; isCandidate: boolean; matchReasons?: string[] }) {
  return (
    <article className={`public-posting-card${posting.featured ? ' is-featured' : ''}`}>
      <img alt="" className="company-placeholder" height="52" src={posting.companyLogoUrl ?? '/images/company-placeholder.svg'} width="52" />
      <div className="public-posting-content">
        <div className="public-posting-heading">
          <div>
            <h3><Link href={`/jobs/${posting.id}`} prefetch={false}>{posting.title}</Link></h3>
            <p className="public-posting-company"><Link href={`/companies/${posting.employerId}`} prefetch={false}>{posting.companyName}{posting.companyVerified ? <VerifiedCheck /> : null}</Link></p>
          </div>
          <span className="posting-badges">{posting.featured ? <FeaturedBadge /> : null}<span className="employment-badge"><Clock {...icon} size={14} />{employmentLabels[posting.employmentType]}</span></span>
        </div>
        <p className="public-posting-meta">
          <span><MapPin {...icon} />{posting.location}</span>
          <span className="posting-salary"><Wallet {...icon} />{formatSalary(posting.salaryMin, posting.salaryMax)}</span>
          <span><Layers {...icon} />{jobLevelLabels[posting.level]}</span>
          <span><Briefcase {...icon} />{industryLabels[posting.industry]}</span>
          <span><CalendarClock {...icon} />Hạn nộp {formatDate(posting.applicationDeadline)}</span>
        </p>
        {posting.skills.length ? <div aria-label="Kỹ năng" className="posting-skill-list">{posting.skills.slice(0, 3).map((skill) => <span className="skill-tag" key={skill}>{skill}</span>)}</div> : null}
        {matchReasons?.length ? <ul aria-label="Lý do phù hợp" className="match-reasons">{matchReasons.map((reason) => <li key={reason}><Check {...icon} /> {reason}</li>)}</ul> : null}
      </div>
      <div className="posting-card-actions">
        {isCandidate ? <SavedPostingButton initialSaved={savedIds.includes(posting.id)} postingId={posting.id} /> : null}
        <Link className="apply-link" href={`/jobs/${posting.id}`} prefetch={false}>Ứng tuyển<span className="visually-hidden">: {posting.title}</span> <ArrowRight {...icon} /></Link>
      </div>
    </article>
  );
}

type HomeSearchParams = Record<string, string | string[] | undefined>;

function searchFilterFromParams(params: HomeSearchParams): SearchFilter {
  const firstValues = Object.fromEntries(
    Object.entries(params).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  );
  return searchFilterSchema.parse({ ...firstValues, employmentType: firstValues.type, maxExperience: firstValues.exp, postedWithinDays: firstValues.posted });
}

/** URL query names of every filter except page, in the order the search form uses. */
function filterParams(filter: SearchFilter) {
  const params = new URLSearchParams();
  if (filter.q) params.set('q', filter.q);
  if (filter.location) params.set('location', filter.location);
  if (filter.employmentType) params.set('type', filter.employmentType);
  if (filter.minSalary) params.set('minSalary', String(filter.minSalary));
  if (filter.industry) params.set('industry', filter.industry);
  if (filter.level) params.set('level', filter.level);
  if (filter.maxExperience !== undefined) params.set('exp', String(filter.maxExperience));
  if (filter.skill) params.set('skill', filter.skill);
  if (filter.postedWithinDays) params.set('posted', String(filter.postedWithinDays));
  if (filter.sort) params.set('sort', filter.sort);
  return params;
}

function searchHref(filter: SearchFilter, page: number) {
  const params = filterParams(filter);
  params.set('page', String(page));
  return `/?${params.toString()}#job-search`;
}

/** Hidden inputs so one form keeps the filters the other form owns. */
function HiddenFilters({ filter, keys }: { filter: SearchFilter; keys: string[] }) {
  return <>{[...filterParams(filter)].filter(([key]) => keys.includes(key)).map(([key, value]) => <input key={key} name={key} type="hidden" value={value} />)}</>;
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

/** Most frequent skills among the listed postings: real "popular searches". */
function popularSkills(postings: PostingSummary[], limit = 6) {
  const counts = new Map<string, number>();
  for (const skill of postings.flatMap((p) => p.skills)) counts.set(skill, (counts.get(skill) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([skill]) => skill);
}

function PillRadios({ legend, name, options, value }: { legend: string; name: string; options: Record<string, string>; value?: string }) {
  return (
    <fieldset className="filter-group">
      <legend className="filter-legend">{legend}</legend>
      <div className="pill-options">
        {Object.entries({ '': 'Tất cả', ...options }).map(([optionValue, label]) => (
          <label className="pill-option" key={optionValue || 'all'}>
            <input defaultChecked={(value ?? '') === optionValue} name={name} type="radio" value={optionValue} />
            <span>{label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default async function HomePage({ searchParams }: { searchParams: Promise<HomeSearchParams> }) {
  const filter = searchFilterFromParams(await searchParams);
  const hasFilters = [...filterParams(filter)].some(([key, value]) => key !== 'sort' || value !== 'newest');
  const [postingsPage, savedIds, profile, recommendations, alerts, thisWeek, allOpen, companiesPage] = await Promise.all([
    listOpenPostings(filter), getSavedPostingIds(), getCurrentProfile(), getRecommendedPostings(), listJobAlerts(),
    listOpenPostings({ postedWithinDays: 7 }).then((page) => page.total).catch(() => 0),
    // Unfiltered, the listing's own total is already every open posting.
    hasFilters ? listOpenPostings({}).then((page) => page.total).catch(() => null) : null,
    listCompanies({}).catch(() => null),
  ]);
  const isCandidate = profile?.role === 'CANDIDATE';
  const pageCount = Math.max(1, Math.ceil(postingsPage.total / postingsPage.pageSize));
  const alertFilter = alertFilterFromSearch(filter);
  // The landing blocks only frame the unfiltered first page; a search goes straight from the hero to its results.
  const isLanding = !hasFilters && postingsPage.page === 1;
  // 'newest' lists featured postings first, so the unfiltered first page already holds the block's ≤ 6.
  const featured = isLanding ? postingsPage.items.filter((p) => p.featured).slice(0, 6) : [];
  const fresh = isLanding ? [...postingsPage.items].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 10) : [];
  const skills = popularSkills(postingsPage.items);
  const now = Date.now();

  return (
    <main className="home-page">
      <HeroBanner companies={companiesPage?.total ?? 0} openPostings={allOpen ?? postingsPage.total}>
        {thisWeek > 0 ? (
          <Link className="hero-badge" href="/?posted=7#job-search"><Sparkles {...icon} />{thisWeek} việc làm mới tuần này</Link>
        ) : null}
        <h1 id="home-title">Tìm công việc thật vừa ý</h1>
        <p>Tin tuyển dụng đang mở từ các công ty trên khắp Việt Nam. Tìm chậm rãi, lưu lại, ứng tuyển khi bạn sẵn sàng.</p>
        <form action="/" aria-label="Tìm việc làm" className="hero-search" method="get">
          <label className="visually-hidden" htmlFor="search-keyword">Từ khóa</label>
          <Input autoComplete="off" defaultValue={filter.q ?? ''} id="search-keyword" name="q" placeholder="Chức danh, kỹ năng, từ khóa…" type="search" />
          <label className="visually-hidden" htmlFor="search-location">Địa điểm</label>
          <input className="text-input" defaultValue={filter.location ?? ''} id="search-location" name="location" placeholder="Tỉnh, thành phố" type="search" />
          <HiddenFilters filter={filter} keys={['type', 'minSalary', 'industry', 'level', 'exp', 'skill', 'posted', 'sort']} />
          <Button type="submit"><Search {...icon} />Tìm việc</Button>
        </form>
        {skills.length ? (
          <nav aria-label="Kỹ năng được tìm nhiều" className="popular-chips">
            {skills.map((skill) => <Link className="chip" href={`/?skill=${encodeURIComponent(skill)}#job-search`} key={skill}>{skill}</Link>)}
          </nav>
        ) : null}
      </HeroBanner>

      {isLanding && companiesPage ? <LogoStrip companies={companiesPage.items.filter((c) => c.openPostings > 0).slice(0, 10)} /> : null}

      {fresh.length ? (
        <div className="home-band">
          <section aria-labelledby="fresh-title" className="home-section fresh-section">
            <FreshCarousel heading={<div className="section-heading"><span className="eyebrow">Việc mới đăng</span><h2 id="fresh-title">Vừa lên bảng tin</h2></div>}>
              {fresh.map((posting) => (
                <li key={posting.id}>
                  <Link className="fresh-card" href={`/jobs/${posting.id}`} prefetch={false}>
                    <span className="fresh-card-top">{formatPostedAgo(posting.createdAt, now)}</span>
                    <span className="fresh-card-main">
                      <img alt="" height="40" src={posting.companyLogoUrl ?? '/images/company-placeholder.svg'} width="40" />
                      <span><span className="fresh-card-title">{posting.title}</span><span className="fresh-card-company">{posting.companyName}</span></span>
                    </span>
                    <span className="fresh-card-meta"><strong>{formatSalary(posting.salaryMin, posting.salaryMax)}</strong> · {posting.location}</span>
                  </Link>
                </li>
              ))}
            </FreshCarousel>
          </section>
        </div>
      ) : null}

      {isCandidate && isLanding && recommendations.length ? (
        <section aria-labelledby="recommended-postings" className="home-section">
          <div className="section-heading">
            <span className="eyebrow">Dựa trên hồ sơ của bạn</span>
            <h2 id="recommended-postings">Gợi ý cho bạn</h2>
            <p>Những tin đang mở phù hợp với kỹ năng và các vị trí bạn từng ứng tuyển.</p>
          </div>
          <div aria-label="Việc làm gợi ý" className="public-posting-list">
            {recommendations.map((posting) => <PostingCard isCandidate key={posting.id} matchReasons={posting.matchReasons} posting={posting} savedIds={savedIds} />)}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="open-postings" className="home-section browse-section" id="job-search">
        <div className="section-heading">
          <span className="eyebrow">Duyệt &amp; lọc</span>
          <h2 id="open-postings">{hasFilters ? 'Kết quả tìm kiếm' : 'Việc làm đang mở'}</h2>
          <p>{postingsPage.total} {hasFilters ? 'tin phù hợp với bộ lọc của bạn.' : 'vị trí đang chờ ứng viên phù hợp.'}</p>
        </div>
        <div className="browse-layout">
          <form action="/" aria-label="Bộ lọc việc làm" className="filter-panel" method="get">
            <HiddenFilters filter={filter} keys={['q', 'location', 'posted']} />
            <PillRadios legend="Hình thức" name="type" options={employmentLabels} value={filter.employmentType} />
            <SalaryRange defaultValue={filter.minSalary} />
            <PillRadios legend="Cấp bậc" name="level" options={jobLevelLabels} value={filter.level} />
            <label className="field-label" htmlFor="search-industry">
              Ngành nghề
              <select className="text-input select-input" defaultValue={filter.industry ?? ''} id="search-industry" name="industry">
                <option value="">Tất cả ngành</option>
                {Object.entries(industryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="field-label" htmlFor="search-experience">
              Kinh nghiệm tối đa (năm)
              <input className="text-input" defaultValue={filter.maxExperience ?? ''} id="search-experience" max="20" min="0" name="exp" placeholder="Không giới hạn" type="number" />
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
            <div className="filter-actions">
              <Button type="submit">Áp dụng bộ lọc</Button>
              {hasFilters ? <Link className="clear-search-link" href="/#job-search">Xóa bộ lọc</Link> : null}
            </div>
          </form>

          <div className="browse-results">
            {isCandidate && Object.keys(alertFilter).length ? <CreateAlertButton alertCount={alerts.length} filter={alertFilter} key={JSON.stringify(alertFilter)} /> : null}

            {featured.length ? (
              <section aria-labelledby="featured-postings" className="featured-postings">
                <h3 className="featured-heading" id="featured-postings">Việc làm nổi bật</h3>
                <div className="featured-posting-grid">
                  {featured.map((posting) => (
                    <Link className="featured-posting-card" href={`/jobs/${posting.id}`} key={posting.id} prefetch={false}>
                      <img alt="" className="company-placeholder" height="40" src={posting.companyLogoUrl ?? '/images/company-placeholder.svg'} width="40" />
                      <span className="featured-posting-copy"><strong>{posting.title}</strong><small>{posting.companyName}</small><small>{posting.location} · {formatSalary(posting.salaryMin, posting.salaryMax)}</small></span>
                      <FeaturedBadge />
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

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
          </div>
        </div>
      </section>

      {isLanding ? (
        <>
          {isCandidate || profile?.role === 'ADMIN' ? null : <EmployerCTA isEmployer={profile?.role === 'EMPLOYER'} />}
          <Suspense fallback={null}>
            <LatestArticles />
          </Suspense>
          <HowItWorks />
          <Suspense fallback={null}>
            <CompaniesAndStories />
          </Suspense>
          <HomeFaq />
          {profile?.role !== 'ADMIN' ? (
            <section aria-labelledby="alert-title" className="alert-section">
              <div className="alert-content">
                <span className="alert-icon"><BellRing {...iconLg} /></span>
                {profile?.role === 'EMPLOYER' ? (
                  <>
                    <h2 id="alert-title">Để ứng viên tìm đến bạn</h2>
                    <p>Đăng tin, nhận hồ sơ và trao đổi với ứng viên ngay trên Job Portal.</p>
                    <Link className="button button-primary" href="/employer/postings/new"><Plus {...icon} />Đăng tin tuyển dụng</Link>
                  </>
                ) : (
                  <>
                    <h2 id="alert-title">Để việc làm tự tìm đến bạn</h2>
                    <p>Lưu một từ khóa, Job Portal báo cho bạn khi có tin mới phù hợp được đăng.</p>
                    {isCandidate ? <HomeAlertForm atLimit={alerts.length >= 5} /> : <Link className="button button-primary" href="/signup?next=/candidate/alerts">Tạo tài khoản để nhận thông báo</Link>}
                  </>
                )}
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </main>
  );
}
