import { listAdminCompanies } from '@/actions/admin';
import { AdminBadge, AdminEmpty, AdminHeading, AdminPager, AdminPanel, AdminTable } from '@/components/admin/admin-common';
import { CompanyVerificationControl } from '@/components/admin/admin-controls';
import { BadgeCheck } from 'lucide-react';
import { icon } from '@/components/ui/primitives';

type Params = { q?: string; verified?: string; page?: string };

export default async function AdminCompaniesPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const verified = params.verified === 'true' ? true : params.verified === 'false' ? false : undefined;
  const page = Math.max(1, Number(params.page) || 1);
  const data = await listAdminCompanies({ q: params.q?.trim(), verified, page });
  return <div className="admin-page">
    <AdminHeading description="Xác minh nhà tuyển dụng và quản lý huy hiệu hiển thị công khai." title="Công ty" />
    <AdminPanel title="Danh sách công ty">
      <form action="/admin/companies" className="admin-filter-bar">
        <label className="admin-search-field"><span>Tìm kiếm</span><input defaultValue={params.q} name="q" placeholder="Tên công ty hoặc email" /></label>
        <label><span>Xác minh</span><select defaultValue={params.verified ?? ''} name="verified"><option value="">Tất cả công ty</option><option value="true">Đã xác minh</option><option value="false">Chưa xác minh</option></select></label>
        <button className="button button-primary button-small" type="submit">Lọc danh sách</button>
      </form>
      {!data ? <AdminEmpty description="Phiên quản trị hết hạn hoặc bạn không có quyền xem danh sách này." title="Không thể tải công ty" /> : data.items.length ? <>
        <AdminTable label="Danh sách công ty"><thead><tr><th>Công ty</th><th>Email nhà tuyển dụng</th><th className="num">Tin đang tuyển</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{data.items.map((company) => <tr key={company.id}>
          <td><span className="admin-company-cell"><img alt="" height="42" src={company.logoUrl ?? '/images/company-placeholder.svg'} width="42" /><span>{company.name}<small>{company.address ?? 'Chưa cập nhật địa chỉ'}</small></span></span></td>
          <td>{company.employerEmail}</td><td className="num">{company.openPostings}</td><td>{company.verifiedAt ? <AdminBadge tone="success"><BadgeCheck {...icon} size={14} />Đã xác minh</AdminBadge> : <AdminBadge tone="warning">Chưa xác minh</AdminBadge>}</td>
          <td><CompanyVerificationControl companyId={company.id} verified={Boolean(company.verifiedAt)} /></td>
        </tr>)}</tbody></AdminTable>
        <AdminPager basePath="/admin/companies" filters={{ q: params.q, verified: params.verified }} page={data.page} pageSize={data.pageSize} total={data.total} />
      </> : <AdminEmpty description="Thử thay đổi từ khóa hoặc bộ lọc." title="Không có công ty phù hợp" />}
    </AdminPanel>
  </div>;
}
