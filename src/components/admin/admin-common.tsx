import Link from 'next/link';
import type { ReactNode } from 'react';
import { Badge, Card, EmptyState, iconLg, PageHeader } from '@/components/ui/primitives';
import { Search } from 'lucide-react';

export function AdminHeading({ title, description, eyebrow = 'Trung tâm quản trị' }: { title: string; description: string; eyebrow?: string }) {
  return <PageHeader className="admin-heading" description={description} eyebrow={eyebrow} title={title} />;
}

export function AdminPanel({ title, action, children, className = '' }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <Card as="section" className={`admin-panel ${className}`}><div className="admin-panel-heading"><h2>{title}</h2>{action}</div>{children}</Card>;
}

export function AdminTable({ children, label }: { children: ReactNode; label: string }) {
  return <div aria-label={label} className="admin-table-scroll" role="region" tabIndex={0}><table className="admin-table">{children}</table></div>;
}

export function AdminEmpty({ title, description }: { title: string; description: string }) {
  return <EmptyState description={description} icon={<Search {...iconLg} />} title={title} />;
}

export function AdminPager({ page, total, pageSize, basePath, filters = {} }: { page: number; total: number; pageSize: number; basePath: string; filters?: Record<string, string | undefined> }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const url = (number: number) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) if (value) query.set(key, value);
    query.set('page', String(number));
    return `${basePath}?${query.toString()}`;
  };
  return <nav aria-label="Phân trang" className="admin-pager"><span>{total ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} / ${total}` : '0 kết quả'}</span><div>{page > 1 ? <Link href={url(page - 1)}>← Trước</Link> : <span aria-disabled="true">← Trước</span>}<strong>Trang {page} / {pages}</strong>{page < pages ? <Link href={url(page + 1)}>Sau →</Link> : <span aria-disabled="true">Sau →</span>}</div></nav>;
}

export function AdminBadge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' }) {
  return <Badge tone={tone}>{children}</Badge>;
}

export function formatAdminDate(value: string | null): string {
  if (!value) return 'Chưa ghi nhận';
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value));
}

export const roleLabels = { CANDIDATE: 'Ứng viên', EMPLOYER: 'Nhà tuyển dụng', ADMIN: 'Quản trị viên' } as const;
export const postingLabels = { DRAFT: 'Bản nháp', PUBLISHED: 'Đang tuyển', CLOSED: 'Đã đóng', EXPIRED: 'Hết hạn' } as const;
export const industryLabels = { IT_SOFTWARE: 'Công nghệ', SALES: 'Kinh doanh', MARKETING: 'Marketing', ACCOUNTING_FINANCE: 'Tài chính', HR: 'Nhân sự', ADMIN: 'Hành chính', CUSTOMER_SERVICE: 'Chăm sóc khách hàng', EDUCATION: 'Giáo dục', HEALTHCARE: 'Y tế', CONSTRUCTION: 'Xây dựng', MANUFACTURING: 'Sản xuất', LOGISTICS: 'Logistics', HOSPITALITY: 'Dịch vụ', DESIGN: 'Thiết kế', LEGAL: 'Pháp lý', OTHER: 'Khác' } as const;
