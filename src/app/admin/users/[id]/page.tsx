import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAdminUser } from '@/actions/admin';
import { UserLockControl } from '@/components/admin/admin-controls';
import { AdminBadge, AdminHeading, AdminPanel, formatAdminDate, roleLabels } from '@/components/admin/admin-common';
import { icon, StatCard } from '@/components/ui/primitives';
import { ArrowLeft } from 'lucide-react';

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAdminUser(id);
  if (!user) notFound();
  return <div className="admin-page">
    <Link className="admin-back-link-inline" href="/admin/users"><ArrowLeft {...icon} />Danh sách người dùng</Link>
    <AdminHeading description="Thông tin tài khoản và quyền truy cập trên hệ thống." eyebrow="Hồ sơ người dùng" title={user.displayName || user.email} />
    <section className="admin-detail-stats"><StatCard label="Tin tuyển dụng" value={user.postings} /><StatCard label="Đơn ứng tuyển" value={user.applications} /><StatCard label="Vai trò" value={roleLabels[user.role]} /></section>
    <div className="admin-detail-columns">
      <AdminPanel title="Thông tin tài khoản"><dl className="admin-detail-list">
        <div><dt>Email</dt><dd>{user.email}</dd></div><div><dt>Tên hiển thị</dt><dd>{user.displayName || 'Chưa cập nhật'}</dd></div><div><dt>Số điện thoại</dt><dd>{user.phone || 'Chưa cập nhật'}</dd></div><div><dt>Vai trò</dt><dd>{roleLabels[user.role]}</dd></div><div><dt>Ngày tạo</dt><dd>{formatAdminDate(user.createdAt)}</dd></div><div><dt>Đăng nhập gần nhất</dt><dd>{formatAdminDate(user.lastSignInAt)}</dd></div><div><dt>Trạng thái</dt><dd>{user.lockedAt ? <AdminBadge tone="danger">Đang khóa</AdminBadge> : <AdminBadge tone="success">Hoạt động</AdminBadge>}</dd></div>{user.lockedReason ? <div><dt>Lý do khóa</dt><dd>{user.lockedReason}</dd></div> : null}
      </dl></AdminPanel>
      <AdminPanel title={user.lockedAt ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}>
        <p className="admin-panel-copy">{user.lockedAt ? 'Cho phép tài khoản đăng nhập và sử dụng các chức năng trở lại.' : 'Tài khoản sẽ bị chặn đăng nhập và sử dụng các chức năng. Hãy nhập lý do để ghi vào nhật ký quản trị.'}</p>
        {user.role === 'ADMIN' ? <p className="admin-protected-note">Tài khoản quản trị viên không thể bị khóa.</p> : <UserLockControl locked={Boolean(user.lockedAt)} userId={user.userId} />}
      </AdminPanel>
    </div>
  </div>;
}
