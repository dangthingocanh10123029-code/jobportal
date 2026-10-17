import Link from 'next/link';
import { listAdminPostings } from '@/actions/admin';
import type { DisplayPostingStatus } from '@/actions/types';
import { AdminBadge, AdminEmpty, AdminHeading, AdminPager, AdminPanel, AdminTable, formatAdminDate, postingLabels } from '@/components/admin/admin-common';
import { PostingModerationControl } from '@/components/admin/admin-controls';

type Params = { q?: string; status?: string; hidden?: string; page?: string };
const statuses: DisplayPostingStatus[] = ['DRAFT', 'PUBLISHED', 'CLOSED', 'EXPIRED'];

export default async function AdminPostingsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const status = statuses.includes(params.status as DisplayPostingStatus) ? params.status as DisplayPostingStatus : undefined;
  const hidden = params.hidden === 'true' ? true : params.hidden === 'false' ? false : undefined;
  const page = Math.max(1, Number(params.page) || 1);
  const data = await listAdminPostings({ q: params.q?.trim(), status, hidden, page });
  return <div className="admin-page">
    <AdminHeading description="Kiểm tra nội dung tin ở mọi trạng thái và xử lý vi phạm." title="Tin tuyển dụng" />
    <AdminPanel title="Tất cả tin tuyển dụng">
      <form action="/admin/postings" className="admin-filter-bar">
        <label className="admin-search-field"><span>Tìm kiếm</span><input defaultValue={params.q} name="q" placeholder="Tên tin hoặc công ty" /></label>
        <label><span>Trạng thái</span><select defaultValue={status ?? ''} name="status"><option value="">Tất cả trạng thái</option>{statuses.map((item) => <option key={item} value={item}>{postingLabels[item]}</option>)}</select></label>
        <label><span>Kiểm duyệt</span><select defaultValue={params.hidden ?? ''} name="hidden"><option value="">Tất cả tin</option><option value="false">Chưa ẩn</option><option value="true">Đang ẩn</option></select></label>
        <button className="button button-primary button-small" type="submit">Lọc danh sách</button>
      </form>
      {!data ? <AdminEmpty description="Phiên quản trị hết hạn hoặc bạn không có quyền xem danh sách này." title="Không thể tải tin tuyển dụng" /> : data.items.length ? <>
        <AdminTable label="Tất cả tin tuyển dụng"><thead><tr><th>Tin tuyển dụng</th><th>Trạng thái</th><th>Hồ sơ</th><th>Ngày đăng</th><th>Kiểm duyệt</th><th>Thao tác</th></tr></thead><tbody>{data.items.map((posting) => <tr key={posting.id}>
          <td><span className="admin-primary-cell">{posting.title}<small>{posting.companyName} · {posting.location}</small></span></td>
          <td><AdminBadge tone={posting.displayStatus === 'PUBLISHED' ? 'success' : 'neutral'}>{postingLabels[posting.displayStatus]}</AdminBadge></td><td>{posting.applications}</td><td>{formatAdminDate(posting.createdAt)}</td>
          <td>{posting.hiddenAt ? <AdminBadge tone="danger">Đang ẩn</AdminBadge> : <AdminBadge tone="success">Công khai</AdminBadge>}</td>
          <td><details className="admin-action-disclosure"><summary>{posting.hiddenAt ? 'Xử lý' : 'Kiểm duyệt'}</summary><div><p><Link href={`/jobs/${posting.id}`} target="_blank">Mở trang tin ↗</Link></p>{posting.hiddenReason ? <p className="admin-hidden-reason"><strong>Lý do:</strong> {posting.hiddenReason}</p> : null}<PostingModerationControl hidden={Boolean(posting.hiddenAt)} postingId={posting.id} /></div></details></td>
        </tr>)}</tbody></AdminTable>
        <AdminPager basePath="/admin/postings" filters={{ q: params.q, status, hidden: params.hidden }} page={data.page} pageSize={data.pageSize} total={data.total} />
      </> : <AdminEmpty description="Thử thay đổi từ khóa hoặc bộ lọc." title="Không có tin phù hợp" />}
    </AdminPanel>
  </div>;
}
