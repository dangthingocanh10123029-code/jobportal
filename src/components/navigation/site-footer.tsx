import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <span>© Job Portal — Tìm việc nhanh, ứng tuyển dễ</span>
        <nav aria-label="Liên kết cuối trang">
          <Link href="/">Tìm việc</Link>
          <Link href="/companies">Công ty</Link>
          <Link href="/guide">Cẩm nang</Link>
        </nav>
      </div>
    </footer>
  );
}
