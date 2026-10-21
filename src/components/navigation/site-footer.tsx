import Link from 'next/link';
import { Briefcase } from 'lucide-react';
import { icon } from '@/components/ui/primitives';

type FooterColumn = [title: string, links: [href: string, label: string][]];

// Contact points only link to pages that exist: there is no published phone, email or address.
const COLUMNS: FooterColumn[] = [
  ['Ứng viên', [['/', 'Tìm việc làm'], ['/companies', 'Công ty'], ['/guide', 'Cẩm nang nghề nghiệp'], ['/signup?next=/candidate/alerts', 'Nhận thông báo việc làm']]],
  ['Nhà tuyển dụng', [['/employer/postings/new', 'Đăng tin tuyển dụng'], ['/employer/billing', 'Gói dịch vụ'], ['/signup', 'Đăng ký nhà tuyển dụng']]],
  ['Liên hệ', [['/guide', 'Liên hệ & hỗ trợ'], ['/#how-it-works', 'Giới thiệu'], ['/#faq', 'Chính sách bảo mật']]],
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <Link aria-label="Job Portal, trang chủ" className="brand" href="/">
            <span aria-hidden="true" className="brand-mark"><Briefcase {...icon} /></span>
            <span aria-hidden="true" className="brand-name">Job Portal</span>
          </Link>
          <p>Tin tuyển dụng đang mở từ các công ty trên khắp Việt Nam. Tìm việc nhanh, ứng tuyển dễ.</p>
        </div>
        <nav aria-label="Liên kết cuối trang" className="site-footer-nav">
          {COLUMNS.map(([title, links]) => (
            <div className="site-footer-column" key={title}>
              <h2>{title}</h2>
              <ul>{links.map(([href, label]) => <li key={label}><Link href={href}>{label}</Link></li>)}</ul>
            </div>
          ))}
        </nav>
      </div>
      <p className="site-footer-bottom">© Job Portal — Tìm việc nhanh, ứng tuyển dễ</p>
    </footer>
  );
}
