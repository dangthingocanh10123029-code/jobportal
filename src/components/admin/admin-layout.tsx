'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, Building2, FileText, History, LayoutDashboard, Package, Receipt, ShieldCheck, Star, Users, BookOpen } from 'lucide-react';
import { icon, iconLg } from '@/components/ui/primitives';

const links = [
  { href: '/admin', label: 'Tổng quan', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Người dùng', icon: Users },
  { href: '/admin/postings', label: 'Tin tuyển dụng', icon: FileText },
  { href: '/admin/companies', label: 'Công ty', icon: Building2 },
  { href: '/admin/audit', label: 'Nhật ký thao tác', icon: History },
  { href: '/admin/articles', label: 'Cẩm nang', icon: BookOpen },
  { href: '/admin/reviews', label: 'Đánh giá', icon: Star },
  { href: '/admin/packages', label: 'Gói dịch vụ', icon: Package },
  { href: '/admin/orders', label: 'Đơn hàng', icon: Receipt },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <div className="admin-frame">
    <aside aria-label="Điều hướng quản trị" className="admin-sidebar">
      <div className="admin-sidebar-heading"><span aria-hidden="true" className="admin-sidebar-mark"><ShieldCheck {...iconLg} /></span><div><strong>Quản trị</strong><small>Job Portal</small></div></div>
      <nav>{links.map((item) => {
        const active = item.href === '/admin' ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return <Link aria-current={active ? 'page' : undefined} href={item.href} key={item.href}><item.icon {...iconLg} />{item.label}</Link>;
      })}</nav>
      <Link className="admin-back-link" href="/"><ArrowLeft {...icon} />Quay lại trang chính</Link>
    </aside>
    <main className="admin-main">{children}</main>
  </div>;
}
