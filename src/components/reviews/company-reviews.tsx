import Link from 'next/link';
import type { CompanyReviewsPage } from '@/actions/reviews';
import type { MyReview, Role } from '@/actions/types';
import { formatDate } from '@/components/format';
import { ReviewForm } from './review-form';
import { Stars, formatRating } from './stars';

type Props = {
  companyId: string;
  companyName: string;
  reviews: CompanyReviewsPage;
  myReview: MyReview | null;
  canReview: boolean;
  role: Role | null;
};

/** Rating summary, the caller's own review (status / rewrite), the write form and the approved list. */
export function CompanyReviews({ companyId, companyName, reviews, myReview, canReview, role }: Props) {
  const { rating } = reviews;
  const pageCount = Math.max(1, Math.ceil(reviews.total / reviews.pageSize));
  const pageHref = (page: number) => `/companies/${companyId}?reviewPage=${page}#reviews`;

  return (
    <section aria-labelledby="company-reviews-title" className="company-reviews" id="reviews">
      <div className="page-heading"><span className="eyebrow">Từ ứng viên</span><h2 id="company-reviews-title">Đánh giá công ty</h2><p>Chia sẻ của những ứng viên từng ứng tuyển vào {companyName}, đã được kiểm duyệt.</p></div>
      <div className="company-reviews-layout">
        <aside aria-label="Điểm đánh giá" className="surface-card review-summary">
          {rating.average !== null ? (
            <>
              <strong className="review-average">{formatRating(rating.average)}</strong>
              <Stars size="lg" value={rating.average} />
              <span className="review-count">{rating.count} đánh giá</span>
            </>
          ) : <><strong className="review-average is-empty">—</strong><span className="review-count">Chưa có đánh giá</span></>}
          <ul aria-label="Phân bố số sao" className="review-distribution">
            {([5, 4, 3, 2, 1] as const).map((star) => {
              const n = rating.distribution[star] ?? 0;
              return (
                <li key={star}>
                  <span>{star} ★</span>
                  <span aria-hidden="true" className="review-bar"><span style={{ width: `${rating.count ? (n / rating.count) * 100 : 0}%` }} /></span>
                  <span>{n}<span className="visually-hidden"> đánh giá {star} sao</span></span>
                </li>
              );
            })}
          </ul>
        </aside>
        <div className="company-reviews-main">
          <MyReviewPanel canReview={canReview} companyId={companyId} companyName={companyName} myReview={myReview} role={role} />
          {reviews.items.length ? (
            <ol className="review-list">
              {reviews.items.map((review) => (
                <li className="surface-card review-card" key={review.id}>
                  <div className="review-card-head"><Stars size="sm" value={review.rating} /><h3>{review.title}</h3></div>
                  <p className="review-meta">{review.authorName} · {formatDate(review.createdAt)}</p>
                  <dl className="review-body">
                    <div><dt>Ưu điểm</dt><dd>{review.pros}</dd></div>
                    <div><dt>Nhược điểm</dt><dd>{review.cons}</dd></div>
                  </dl>
                </li>
              ))}
            </ol>
          ) : <div className="surface-card company-no-postings"><h3>Chưa có đánh giá nào</h3><p>Đánh giá đã được duyệt sẽ hiển thị tại đây.</p></div>}
          {pageCount > 1 ? (
            <nav aria-label="Phân trang đánh giá" className="pagination">
              {reviews.page > 1 ? <Link className="pagination-link" href={pageHref(reviews.page - 1)} scroll={false}>← Trang trước</Link> : <span />}
              <span className="pagination-count">Trang {reviews.page} / {pageCount}</span>
              {reviews.page < pageCount ? <Link className="pagination-link" href={pageHref(reviews.page + 1)} scroll={false}>Trang sau →</Link> : <span />}
            </nav>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function MyReviewPanel({ companyId, companyName, myReview, canReview, role }: Omit<Props, 'reviews'>) {
  if (myReview?.status === 'PENDING') {
    return <div className="surface-card review-mine is-pending" role="status"><strong>Đánh giá của bạn đang chờ duyệt</strong><p>“{myReview.title}” sẽ hiển thị công khai sau khi quản trị viên kiểm duyệt.</p></div>;
  }
  if (myReview?.status === 'APPROVED') {
    return <div className="surface-card review-mine is-approved"><strong>Bạn đã đánh giá công ty này</strong><p>Đánh giá “{myReview.title}” đang hiển thị{myReview.anonymous ? ' ở chế độ ẩn danh' : ''}.</p></div>;
  }
  if (myReview?.status === 'REJECTED') {
    return (
      <div className="surface-card review-mine is-rejected">
        <strong>Đánh giá của bạn chưa được duyệt</strong>
        <p><span className="review-reason-label">Lý do:</span> {myReview.rejectReason}</p>
        <p>Bạn có thể chỉnh sửa và gửi lại để được duyệt.</p>
        <ReviewForm companyId={companyId} companyName={companyName} initial={myReview} />
      </div>
    );
  }
  if (canReview) {
    return <details className="surface-card review-mine review-write"><summary>Viết đánh giá về {companyName}</summary><ReviewForm companyId={companyId} companyName={companyName} /></details>;
  }
  if (role === 'CANDIDATE') return <p className="review-hint">Bạn có thể viết đánh giá sau khi ứng tuyển vào một vị trí của công ty này.</p>;
  if (!role) return <p className="review-hint"><Link href="/login">Đăng nhập</Link> bằng tài khoản ứng viên để viết đánh giá.</p>;
  return null;
}
