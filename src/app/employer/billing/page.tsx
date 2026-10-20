import Link from 'next/link';
import { listMyOrders, listPackages } from '@/actions/billing';
import { listMyPostings } from '@/actions/postings';
import { OrderForm } from '@/components/billing/billing-controls';
import { formatVnd, orderStatusLabels, orderStatusTones } from '@/components/billing/labels';
import { formatDate, formatDateTime } from '@/components/format';
import { Badge, Card, EmptyState, PageHeader } from '@/components/ui/primitives';

type Params = Record<string, string | string[] | undefined>;

export default async function EmployerBillingPage({ searchParams }: { searchParams: Promise<Params> }) {
  const { posting } = await searchParams;
  const [packages, postings, orders] = await Promise.all([listPackages(), listMyPostings(), listMyOrders()]);
  const open = postings.filter((p) => p.displayStatus === 'PUBLISHED' && !p.hiddenAt);
  return (
    <main className="page-shell billing-page">
      <PageHeader description="Đưa tin lên đầu danh sách và vào khối Việc làm nổi bật trên trang chủ." eyebrow="Không gian nhà tuyển dụng" title="Gói dịch vụ & đẩy tin" />
      <p className="billing-simulated-note" role="note"><strong>Thanh toán giả lập</strong> — hệ thống không tích hợp cổng thanh toán và không thu tiền thật.</p>

      {packages.length ? (
        <section aria-labelledby="billing-packages" className="billing-package-grid">
          <h2 className="visually-hidden" id="billing-packages">Bảng gói</h2>
          {packages.map((pkg) => <Card as="article" className="billing-package-card" key={pkg.id}>
            <span className="eyebrow">{pkg.code}</span>
            <h3>{pkg.name}</h3>
            <p className="billing-price">{formatVnd(pkg.priceVnd)}<small> / {pkg.durationDays} ngày</small></p>
            {pkg.description ? <p>{pkg.description}</p> : null}
          </Card>)}
        </section>
      ) : <EmptyState description="Quản trị viên chưa mở bán gói nào. Vui lòng quay lại sau." title="Chưa có gói dịch vụ" />}

      {packages.length ? <Card as="section" aria-labelledby="billing-order" className="billing-panel">
        <h2 id="billing-order">Đẩy tin nổi bật</h2>
        <p className="billing-hint">Mua thêm khi tin đang nổi bật sẽ cộng dồn thời hạn.</p>
        <OrderForm initialPostingId={typeof posting === 'string' ? posting : undefined} packages={packages} postings={open.map(({ id, title }) => ({ id, title }))} />
      </Card> : null}

      <Card as="section" aria-labelledby="billing-history" className="billing-panel">
        <h2 id="billing-history">Lịch sử đơn hàng</h2>
        {orders.length ? <ul className="billing-order-list">{orders.map((order) => <li key={order.id}>
          <div><strong>{order.postingTitle}</strong><small>{order.packageName} · {formatVnd(order.amountVnd)} · {formatDateTime(order.createdAt)}</small>
            {order.featuredUntil ? <small>Nổi bật đến {formatDate(order.featuredUntil)}</small> : null}</div>
          <Badge tone={orderStatusTones[order.status]}>{orderStatusLabels[order.status]}</Badge>
          {order.status === 'PENDING' ? <Link className="button button-primary button-small" href={`/employer/billing/checkout/${order.id}`}>Thanh toán</Link> : null}
        </li>)}</ul> : <p className="billing-hint">Chưa có đơn hàng nào.</p>}
      </Card>
    </main>
  );
}
