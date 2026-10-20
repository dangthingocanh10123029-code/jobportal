import Link from 'next/link';
import { searchTalent } from '@/actions/talent';
import { TalentCard } from '@/components/talent/talent-card';
import { PageHeader } from '@/components/ui/primitives';

export const metadata = { title: 'Tìm ứng viên — Job Portal' };

type TalentSearchParams = Record<string, string | string[] | undefined>;
const FILTER_KEYS = ['q', 'skill', 'location', 'minExperience'] as const;

export default async function TalentSearchPage({ searchParams }: { searchParams: Promise<TalentSearchParams> }) {
  const params = await searchParams;
  const value = (key: string) => (Array.isArray(params[key]) ? params[key][0] : params[key])?.trim() || undefined;
  const filter = { q: value('q'), skill: value('skill'), location: value('location'), minExperience: value('minExperience'), page: value('page') };
  // NaN from a malformed URL value is dropped by talentFilterSchema.
  const result = await searchTalent({ ...filter, minExperience: filter.minExperience ? Number(filter.minExperience) : undefined, page: filter.page ? Number(filter.page) : undefined });
  const hasFilter = FILTER_KEYS.some((key) => filter[key]);

  function pageHref(page: number) {
    const query = new URLSearchParams();
    for (const key of FILTER_KEYS) if (filter[key]) query.set(key, filter[key]);
    query.set('page', String(page));
    return `/employer/talent?${query.toString()}`;
  }

  const pageCount = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1;

  return (
    <main className="page-shell talent-page">
      <PageHeader actions={<Link className="button button-quiet" href="/employer/talent/saved">Ứng viên đã lưu</Link>} description="Ứng viên đang bật “Sẵn sàng tìm việc”. Thông tin liên hệ được ẩn; hãy gửi lời mời ứng tuyển vào tin của bạn." eyebrow="Nhà tuyển dụng" title="Tìm ứng viên" />
      <form action="/employer/talent" aria-label="Bộ lọc ứng viên" className="talent-filter-form" method="get">
        <label className="field-label">Từ khóa<input className="text-input" defaultValue={filter.q ?? ''} maxLength={100} name="q" placeholder="Tên, tiêu đề hồ sơ…" type="search" /></label>
        <label className="field-label">Kỹ năng<input className="text-input" defaultValue={filter.skill ?? ''} maxLength={100} name="skill" placeholder="Ví dụ: Excel" /></label>
        <label className="field-label">Địa điểm<input className="text-input" defaultValue={filter.location ?? ''} maxLength={100} name="location" placeholder="Ví dụ: Hà Nội" /></label>
        <label className="field-label">Kinh nghiệm tối thiểu (năm)<input className="text-input" defaultValue={filter.minExperience ?? ''} inputMode="numeric" max={50} min={0} name="minExperience" type="number" /></label>
        <div className="talent-filter-actions"><button className="button button-primary" type="submit">Tìm ứng viên</button>{hasFilter ? <Link className="button button-quiet" href="/employer/talent">Xóa lọc</Link> : null}</div>
      </form>
      {!result ? (
        <section className="surface-card companies-empty-state" role="alert"><h2>Không thể tải danh sách ứng viên</h2><p>Chỉ tài khoản nhà tuyển dụng mới dùng được tính năng này. Vui lòng tải lại trang hoặc thử lại sau.</p></section>
      ) : (
        <>
          <div aria-live="polite" className="companies-results-heading"><h2>{hasFilter ? 'Kết quả tìm kiếm' : 'Ứng viên mới cập nhật'}</h2><span>{result.total} ứng viên</span></div>
          {result.items.length ? (
            <div aria-label="Danh sách ứng viên" className="talent-grid">{result.items.map((talent) => <TalentCard key={talent.candidateId} talent={talent} />)}</div>
          ) : (
            <section className="surface-card companies-empty-state">
              <img alt="" height="180" src="/images/empty-search.svg" width="240" />
              <h2>{hasFilter ? 'Không tìm thấy ứng viên phù hợp' : 'Chưa có ứng viên nào sẵn sàng tìm việc'}</h2>
              <p>{hasFilter ? 'Thử nới lỏng bộ lọc hoặc dùng từ khóa khác.' : 'Ứng viên bật “Sẵn sàng tìm việc” sẽ xuất hiện tại đây.'}</p>
            </section>
          )}
          {pageCount > 1 ? (
            <nav aria-label="Phân trang ứng viên" className="pagination">
              {result.page > 1 ? <Link className="pagination-link" href={pageHref(result.page - 1)}>← Trang trước</Link> : <span />}
              <span className="pagination-count">Trang {result.page} / {pageCount}</span>
              {result.page < pageCount ? <Link className="pagination-link" href={pageHref(result.page + 1)}>Trang sau →</Link> : <span />}
            </nav>
          ) : null}
        </>
      )}
    </main>
  );
}
