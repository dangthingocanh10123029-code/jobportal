export function PageSkeleton() {
  return (
    <main aria-busy="true" aria-label="Đang tải nội dung" className="page-shell skeleton-page">
      <div className="skeleton-block skeleton-heading" />
      <div className="skeleton-stats"><span className="skeleton-block" /><span className="skeleton-block" /><span className="skeleton-block" /></div>
      <div className="skeleton-block skeleton-row" />
      <div className="skeleton-block skeleton-row" />
      <div className="skeleton-block skeleton-row" />
    </main>
  );
}
