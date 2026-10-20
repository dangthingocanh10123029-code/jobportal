import { listAuditLog } from '@/actions/admin';
import type { AuditAction } from '@/actions/types';
import { AdminBadge, AdminEmpty, AdminHeading, AdminPager, AdminPanel, AdminTable, formatAdminDate } from '@/components/admin/admin-common';

type Params = { action?: string; page?: string };
const actions: AuditAction[] = ['USER_LOCKED', 'USER_UNLOCKED', 'POSTING_HIDDEN', 'POSTING_UNHIDDEN', 'COMPANY_VERIFIED', 'COMPANY_UNVERIFIED', 'ARTICLE_PUBLISHED', 'ARTICLE_UNPUBLISHED', 'REVIEW_APPROVED', 'REVIEW_REJECTED'];
const labels: Record<AuditAction, string> = { USER_LOCKED: 'Khóa tài khoản', USER_UNLOCKED: 'Mở khóa tài khoản', POSTING_HIDDEN: 'Ẩn tin', POSTING_UNHIDDEN: 'Bỏ ẩn tin', COMPANY_VERIFIED: 'Xác minh công ty', COMPANY_UNVERIFIED: 'Bỏ xác minh', ARTICLE_PUBLISHED: 'Đăng bài cẩm nang', ARTICLE_UNPUBLISHED: 'Gỡ bài cẩm nang', REVIEW_APPROVED: 'Duyệt đánh giá', REVIEW_REJECTED: 'Từ chối đánh giá' };

export default async function AdminAuditPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const action = actions.includes(params.action as AuditAction) ? params.action as AuditAction : undefined;
  const page = Math.max(1, Number(params.page) || 1);
  const data = await listAuditLog({ action, page });
  return <div className="admin-page">
    <AdminHeading description="Lịch sử append-only về những thao tác quản trị trên hệ thống." title="Nhật ký thao tác" />
    <AdminPanel title="Lịch sử kiểm duyệt">
      <form action="/admin/audit" className="admin-filter-bar admin-audit-filter">
        <label><span>Loại thao tác</span><select defaultValue={action ?? ''} name="action"><option value="">Tất cả thao tác</option>{actions.map((item) => <option key={item} value={item}>{labels[item]}</option>)}</select></label>
        <button className="button button-primary button-small" type="submit">Lọc nhật ký</button>
      </form>
      {!data ? <AdminEmpty description="Phiên quản trị hết hạn hoặc bạn không có quyền xem nhật ký." title="Không thể tải nhật ký" /> : data.items.length ? <>
        <AdminTable label="Nhật ký thao tác quản trị"><thead><tr><th>Thời gian</th><th>Quản trị viên</th><th>Thao tác</th><th>Đối tượng</th><th>Chi tiết</th></tr></thead><tbody>{data.items.map((entry) => <tr key={entry.id}>
          <td>{formatAdminDate(entry.createdAt)}</td><td><span className="admin-primary-cell">{entry.actorEmail}<small>{entry.actorId}</small></span></td><td><AdminBadge tone={entry.action === 'USER_LOCKED' || entry.action === 'POSTING_HIDDEN' || entry.action === 'REVIEW_REJECTED' ? 'warning' : 'info'}>{labels[entry.action]}</AdminBadge></td><td><span className="admin-primary-cell">{entry.targetLabel}<small>{entry.targetType} · {entry.targetId}</small></span></td><td><details className="admin-audit-details"><summary>Xem chi tiết</summary><dl>{Object.entries(entry.details).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl></details></td>
        </tr>)}</tbody></AdminTable>
        <AdminPager basePath="/admin/audit" filters={{ action }} page={data.page} pageSize={data.pageSize} total={data.total} />
      </> : <AdminEmpty description="Các thao tác quản trị sẽ xuất hiện ở đây sau khi được thực hiện." title="Chưa có thao tác nào" />}
    </AdminPanel>
  </div>;
}
