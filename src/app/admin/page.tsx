import Link from 'next/link';
import { getAdminStats } from '@/actions/admin';
import { AdminBadge, AdminHeading, AdminPanel, formatAdminDate, industryLabels } from '@/components/admin/admin-common';
import { formatVnd } from '@/components/billing/labels';
import { iconLg, StatCard } from '@/components/ui/primitives';
import { ArrowRight, Banknote, FileText, Inbox, Lock, Users } from 'lucide-react';

function chartPath(values: number[], max: number) {
  return values.map((value, index) => `${index === 0 ? 'M' : 'L'} ${(index / Math.max(1, values.length - 1)) * 760} ${145 - (value / max) * 125}`).join(' ');
}

export default async function AdminDashboardPage() {
  const stats = await getAdminStats();
  if (!stats) return <section className="admin-page"><AdminHeading description="Tổng quan hoạt động và sức khỏe hệ thống." title="Tổng quan" /><div className="admin-error-state">Không thể tải số liệu quản trị. Vui lòng thử tải lại trang.</div></section>;
  const max = Math.max(1, ...stats.daily.flatMap((item) => [item.signups, item.applications, item.postings]));
  const newest = stats.daily.at(-1);
  return <div className="admin-page">
    <AdminHeading description="Theo dõi người dùng, tin tuyển dụng và hoạt động gần đây." title="Tổng quan" />
    <section aria-label="Số liệu tổng quan" className="admin-stat-grid">
      <StatCard detail={`${stats.users.CANDIDATE} ứng viên · ${stats.users.EMPLOYER} nhà tuyển dụng`} icon={<Users {...iconLg} />} label="Người dùng" value={stats.users.CANDIDATE + stats.users.EMPLOYER + stats.users.ADMIN} />
      <StatCard detail={`${stats.postings.PUBLISHED} đang tuyển · ${stats.postings.hidden} bị ẩn`} icon={<FileText {...iconLg} />} label="Tin tuyển dụng" value={stats.postings.DRAFT + stats.postings.PUBLISHED + stats.postings.CLOSED + stats.postings.EXPIRED} />
      <StatCard detail={`${stats.applications.SUBMITTED} hồ sơ mới`} icon={<Inbox {...iconLg} />} label="Đơn ứng tuyển" value={Object.values(stats.applications).reduce((sum, count) => sum + count, 0)} />
      <StatCard detail={stats.users.locked ? `${stats.users.locked} tài khoản đang khóa` : 'Tất cả tài khoản đều hoạt động'} icon={<Lock {...iconLg} />} label="Tài khoản bị khóa" value={stats.users.locked} />
      {stats.revenue ? <StatCard detail={`${stats.revenue.paidOrders} đơn đã thanh toán · 30 ngày: ${formatVnd(stats.revenue.last30DaysVnd)} (giả lập)`} icon={<Banknote {...iconLg} />} label="Doanh thu gói dịch vụ" value={formatVnd(stats.revenue.totalVnd)} /> : null}
    </section>
    <AdminPanel className="admin-chart-panel" title="Hoạt động 30 ngày">
      <div aria-label="Biểu đồ số lượt đăng ký, ứng tuyển và đăng tin mỗi ngày trong 30 ngày gần nhất" className="admin-chart-wrap" role="img">
        <svg aria-hidden="true" preserveAspectRatio="none" viewBox="0 0 760 160"><path className="admin-chart-gridline" d="M0 20H760 M0 82H760 M0 145H760" /><path className="chart-signups" d={chartPath(stats.daily.map((item) => item.signups), max)} /><path className="chart-applications" d={chartPath(stats.daily.map((item) => item.applications), max)} /><path className="chart-postings" d={chartPath(stats.daily.map((item) => item.postings), max)} /></svg>
      </div>
      <div className="admin-chart-legend"><span><i className="chart-signups-dot" />Đăng ký</span><span><i className="chart-applications-dot" />Ứng tuyển</span><span><i className="chart-postings-dot" />Tin tuyển dụng</span></div>
      <div className="admin-chart-dates"><span>{stats.daily[0]?.date}</span><span>{newest?.date}</span></div>
    </AdminPanel>
    <div className="admin-overview-columns">
      <AdminPanel title="Công ty nổi bật"><ol className="admin-ranking-list">{stats.topCompanies.map((company, index) => <li key={company.id}><span className="admin-rank">{String(index + 1).padStart(2, '0')}</span><span className="admin-rank-name">{company.name}<small>{company.openPostings} tin đang tuyển · {company.applications} hồ sơ</small></span><Link aria-label={`Xem danh sách công ty ${company.name}`} href={`/admin/companies?q=${encodeURIComponent(company.name)}`} prefetch={false}><ArrowRight {...iconLg} /></Link></li>)}</ol></AdminPanel>
      <AdminPanel title="Ngành nghề đang tuyển"><ol className="admin-ranking-list">{stats.topIndustries.map((item, index) => <li key={item.industry}><span className="admin-rank">{String(index + 1).padStart(2, '0')}</span><span className="admin-rank-name">{industryLabels[item.industry]}<small>{item.openPostings} tin đang tuyển</small></span><AdminBadge tone="info">{item.openPostings}</AdminBadge></li>)}</ol></AdminPanel>
    </div>
    <p className="admin-updated-at">Số liệu tính đến {formatAdminDate(new Date().toISOString())}</p>
  </div>;
}
