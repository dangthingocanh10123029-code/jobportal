import Link from 'next/link';
import { Briefcase } from 'lucide-react';
import { icon } from '@/components/ui/primitives';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <Link aria-label="Job Portal, trang chủ" className="brand" href="/">
          <span aria-hidden="true" className="brand-mark"><Briefcase {...icon} /></span>
          <span aria-hidden="true" className="brand-name">Job Portal</span>
        </Link>
        <nav aria-label="Liên kết cuối trang">
          <Link href="/#how-it-works">Giới thiệu</Link>
          <Link href="/#faq">Bảo mật</Link>
          <Link href="/guide">Liên hệ</Link>
          <Link href="/signup">Nhà tuyển dụng</Link>
        </nav>
        <span>© Job Portal — Tìm việc nhanh, ứng tuyển dễ</span>
      </div>
    </footer>
  );
}
