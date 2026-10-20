'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/admin', label: 'Tổng quan', icon: '▦' },
  { href: '/admin/users', label: 'Người dùng', icon: '♙' },
  { href: '/admin/postings', label: 'Tin tuyển dụng', icon: '▤' },
  { href: '/admin/companies', label: 'Công ty', icon: '⌂' },
  { href: '/admin/audit', label: 'Nhật ký thao tác', icon: '◷' },
  { href: '/admin/articles', label: 'Cẩm nang', icon: '▧' },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <div className="admin-frame">
    <aside aria-label="Điều hướng quản trị" className="admin-sidebar">
      <div className="admin-sidebar-heading"><span className="admin-sidebar-mark">A</span><div><strong>Quản trị</strong><small>Job Portal</small></div></div>
      <nav>{links.map((item) => {
        const active = item.href === '/admin' ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return <Link aria-current={active ? 'page' : undefined} href={item.href} key={item.href}><span aria-hidden="true">{item.icon}</span>{item.label}</Link>;
      })}</nav>
      <Link className="admin-back-link" href="/">← Quay lại trang chính</Link>
    </aside>
    <main className="admin-main">{children}</main>
  </div>;
}
