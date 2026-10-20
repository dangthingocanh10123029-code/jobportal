import { listAdminPackages } from '@/actions/billing';
import { AdminBadge, AdminEmpty, AdminHeading, AdminPanel } from '@/components/admin/admin-common';
import { PackageEditor } from '@/components/billing/billing-controls';
import { formatVnd } from '@/components/billing/labels';

export default async function AdminPackagesPage() {
  const packages = await listAdminPackages();
  return (
    <div className="admin-page">
      <AdminHeading description="Giá, thời hạn và trạng thái bán của gói đẩy tin. Thanh toán trong hệ thống là giả lập." title="Gói dịch vụ" />
      {!packages ? <AdminPanel title="Gói dịch vụ"><AdminEmpty description="Phiên quản trị đã hết hạn hoặc bạn không có quyền." title="Không tải được gói dịch vụ" /></AdminPanel> : <>
        <AdminPanel title="Các gói hiện có">
          {packages.length ? <ul className="billing-admin-packages">{packages.map((pkg) => <li key={pkg.id}>
            <details className="admin-action-disclosure"><summary><span className="admin-primary-cell">{pkg.name}<small>{pkg.code} · {formatVnd(pkg.priceVnd)} · {pkg.durationDays} ngày</small></span><AdminBadge tone={pkg.active ? 'success' : 'neutral'}>{pkg.active ? 'Đang bán' : 'Đã tắt'}</AdminBadge></summary>
              <PackageEditor pkg={pkg} />
            </details>
          </li>)}</ul> : <AdminEmpty description="Tạo gói đầu tiên ở bên dưới." title="Chưa có gói nào" />}
        </AdminPanel>
        <AdminPanel title="Tạo gói mới"><PackageEditor /></AdminPanel>
      </>}
    </div>
  );
}
