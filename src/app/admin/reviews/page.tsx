import Link from 'next/link';
import { listAdminReviews } from '@/actions/admin';
import { adminReviewFilterSchema } from '@/actions/reviews-schema';
import type { ReviewStatus } from '@/actions/types';
import { AdminBadge, AdminEmpty, AdminHeading, AdminPager, AdminPanel, AdminTable, formatAdminDate } from '@/components/admin/admin-common';
import { ReviewModerationControl } from '@/components/admin/admin-controls';
import { Stars } from '@/components/reviews/stars';

type Params = Record<string, string | string[] | undefined>;
const statusLabels: Record<ReviewStatus, string> = { PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Bị từ chối' };
const statusTones = { PENDING: 'warning', APPROVED: 'success', REJECTED: 'danger' } as const;

export default async function AdminReviewsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const raw = await searchParams;
  const filter = adminReviewFilterSchema.parse({ status: raw.status, page: raw.page });
  const data = await listAdminReviews(filter);
  return (
    <div className="admin-page">
      <AdminHeading description="Kiểm duyệt đánh giá công ty của ứng viên trước khi hiển thị công khai." title="Đánh giá công ty" />
      <AdminPanel title="Đánh giá">
        <form action="/admin/reviews" className="admin-filter-bar">
          <label><span>Trạng thái</span>
            <select defaultValue={filter.status ?? ''} name="status"><option value="">Tất cả</option>{(Object.keys(statusLabels) as ReviewStatus[]).map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select>
          </label>
          <button className="button button-quiet button-small" type="submit">Lọc</button>
        </form>
        {!data ? <AdminEmpty description="Phiên quản trị đã hết hạn hoặc bạn không có quyền." title="Không tải được đánh giá" /> : data.items.length ? (
          <>
            <AdminTable label="Danh sách đánh giá">
              <thead><tr><th>Đánh giá</th><th>Số sao</th><th>Người viết</th><th>Trạng thái</th><th>Ngày gửi</th><th>Thao tác</th></tr></thead>
              <tbody>{data.items.map((review) => (
                <tr key={review.id}>
                  <td><span className="admin-primary-cell">{review.title}<small><Link href={`/companies/${review.companyId}#reviews`} prefetch={false} target="_blank">{review.companyName} ↗</Link></small></span></td>
                  <td><Stars size="sm" value={review.rating} /></td>
                  <td><span className="admin-primary-cell">{review.authorName}<small>{review.authorEmail}</small></span></td>
                  <td><AdminBadge tone={statusTones[review.status]}>{statusLabels[review.status]}</AdminBadge></td>
                  <td>{formatAdminDate(review.createdAt)}</td>
                  <td>
                    <details className="admin-action-disclosure admin-review-disclosure"><summary>{review.status === 'PENDING' ? 'Kiểm duyệt' : 'Xem / xử lý'}</summary><div>
                      <dl className="admin-review-text"><dt>Ưu điểm</dt><dd>{review.pros}</dd><dt>Nhược điểm</dt><dd>{review.cons}</dd></dl>
                      {review.rejectReason ? <p className="admin-hidden-reason"><strong>Lý do từ chối:</strong> {review.rejectReason}</p> : null}
                      <ReviewModerationControl reviewId={review.id} status={review.status} />
                    </div></details>
                  </td>
                </tr>
              ))}</tbody>
            </AdminTable>
            <AdminPager basePath="/admin/reviews" filters={{ status: filter.status }} page={data.page} pageSize={data.pageSize} total={data.total} />
          </>
        ) : <AdminEmpty description="Không có đánh giá nào ở trạng thái này." title="Chưa có đánh giá" />}
      </AdminPanel>
    </div>
  );
}
