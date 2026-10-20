import { listAdminOrders } from '@/actions/billing';
import { adminOrderFilterSchema } from '@/actions/billing-schema';
import type { OrderStatus } from '@/actions/types';
import { AdminBadge, AdminEmpty, AdminHeading, AdminPager, AdminPanel, AdminTable, formatAdminDate } from '@/components/admin/admin-common';
import { formatVnd, orderStatusLabels, orderStatusTones } from '@/components/billing/labels';

type Params = Record<string, string | string[] | undefined>;

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<Params> }) {
  const raw = await searchParams;
  const filter = adminOrderFilterSchema.parse({ status: raw.status, page: raw.page });
  const data = await listAdminOrders(filter);
  return (
    <div className="admin-page">
      <AdminHeading description="Đơn mua gói đẩy tin. Thanh toán giả lập — doanh thu chỉ để minh họa, không có tiền thật." title="Đơn hàng" />
      <AdminPanel title="Đơn hàng">
        <form action="/admin/orders" className="admin-filter-bar">
          <label><span>Trạng thái</span>
            <select defaultValue={filter.status ?? ''} name="status"><option value="">Tất cả</option>{(Object.keys(orderStatusLabels) as OrderStatus[]).map((status) => <option key={status} value={status}>{orderStatusLabels[status]}</option>)}</select>
          </label>
          <button className="button button-quiet button-small" type="submit">Lọc</button>
        </form>
        {!data ? <AdminEmpty description="Phiên quản trị đã hết hạn hoặc bạn không có quyền." title="Không tải được đơn hàng" /> : data.items.length ? <>
          <AdminTable label="Danh sách đơn hàng">
            <thead><tr><th>Tin tuyển dụng</th><th>Công ty</th><th>Gói</th><th className="num">Số tiền</th><th>Trạng thái</th><th>Ngày tạo</th><th>Thanh toán</th></tr></thead>
            <tbody>{data.items.map((order) => <tr key={order.id}>
              <td>{order.postingTitle}</td>
              <td><span className="admin-primary-cell">{order.companyName}<small>{order.employerEmail}</small></span></td>
              <td>{order.packageName}</td>
              <td className="num">{formatVnd(order.amountVnd)}</td>
              <td><AdminBadge tone={orderStatusTones[order.status]}>{orderStatusLabels[order.status]}</AdminBadge></td>
              <td>{formatAdminDate(order.createdAt)}</td>
              <td>{order.paidAt ? formatAdminDate(order.paidAt) : '—'}</td>
            </tr>)}</tbody>
          </AdminTable>
          <AdminPager basePath="/admin/orders" filters={{ status: filter.status }} page={data.page} pageSize={data.pageSize} total={data.total} />
        </> : <AdminEmpty description="Không có đơn hàng nào ở trạng thái này." title="Chưa có đơn hàng" />}
      </AdminPanel>
    </div>
  );
}
