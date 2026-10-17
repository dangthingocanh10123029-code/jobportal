import Link from 'next/link';
import { listAdminUsers } from '@/actions/admin';
import type { Role } from '@/actions/types';
import { AdminBadge, AdminEmpty, AdminHeading, AdminPager, AdminPanel, AdminTable, formatAdminDate, roleLabels } from '@/components/admin/admin-common';

type Params = { q?: string; role?: string; locked?: string; page?: string };
const roles: Role[] = ['CANDIDATE', 'EMPLOYER', 'ADMIN'];

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const role = roles.includes(params.role as Role) ? params.role as Role : undefined;
  const locked = params.locked === 'true' ? true : params.locked === 'false' ? false : undefined;
  const page = Math.max(1, Number(params.page) || 1);
  const data = await listAdminUsers({ q: params.q?.trim(), role, locked, page });
  const filters = { q: params.q, role, locked: params.locked };
  return <div className="admin-page">
    <AdminHeading description="Tìm tài khoản, xem hoạt động và quản lý quyền truy cập." title="Người dùng" />
    <AdminPanel title="Danh sách tài khoản">
      <form action="/admin/users" className="admin-filter-bar">
        <label className="admin-search-field"><span>Tìm kiếm</span><input defaultValue={params.q} name="q" placeholder="Tên hoặc email" /></label>
        <label><span>Vai trò</span><select defaultValue={role ?? ''} name="role"><option value="">Tất cả vai trò</option>{roles.map((item) => <option key={item} value={item}>{roleLabels[item]}</option>)}</select></label>
        <label><span>Trạng thái</span><select defaultValue={params.locked ?? ''} name="locked"><option value="">Tất cả</option><option value="false">Đang hoạt động</option><option value="true">Đang khóa</option></select></label>
        <button className="button button-primary button-small" type="submit">Lọc danh sách</button>
      </form>
      {!data ? <AdminEmpty description="Phiên quản trị hết hạn hoặc bạn không có quyền xem danh sách này." title="Không thể tải người dùng" /> : data.items.length ? <>
        <AdminTable label="Danh sách tài khoản"><thead><tr><th>Tài khoản</th><th>Vai trò</th><th>Ngày tạo</th><th>Đăng nhập gần nhất</th><th>Trạng thái</th><th /></tr></thead><tbody>{data.items.map((user) => <tr key={user.userId}>
          <td><Link className="admin-primary-cell" href={`/admin/users/${user.userId}`} prefetch={false}>{user.displayName || 'Chưa cập nhật'}<small>{user.email}</small></Link></td>
          <td>{roleLabels[user.role]}</td><td>{formatAdminDate(user.createdAt)}</td><td>{formatAdminDate(user.lastSignInAt)}</td>
          <td>{user.lockedAt ? <AdminBadge tone="danger">Đang khóa</AdminBadge> : <AdminBadge tone="success">Hoạt động</AdminBadge>}</td>
          <td><Link aria-label={`Xem ${user.email}`} className="admin-row-link" href={`/admin/users/${user.userId}`} prefetch={false}>Chi tiết →</Link></td>
        </tr>)}</tbody></AdminTable>
        <AdminPager basePath="/admin/users" filters={filters} page={data.page} pageSize={data.pageSize} total={data.total} />
      </> : <AdminEmpty description="Thử thay đổi từ khóa hoặc bộ lọc." title="Không có người dùng phù hợp" />}
    </AdminPanel>
  </div>;
}
