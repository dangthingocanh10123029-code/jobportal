import Link from 'next/link';
import { notFound } from 'next/navigation';
import { listMyOrders } from '@/actions/billing';
import { CheckoutActions } from '@/components/billing/billing-controls';
import { formatVnd, orderStatusLabels, orderStatusTones } from '@/components/billing/labels';
import { formatDateTime } from '@/components/format';
import { Badge, Card, PageHeader } from '@/components/ui/primitives';

export default async function CheckoutPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const order = (await listMyOrders()).find((o) => o.id === orderId);
  if (!order) notFound();
  return (
    <main className="page-shell billing-page billing-checkout-page">
      <PageHeader eyebrow="Gói dịch vụ" title="Thanh toán đơn hàng" />
      <p className="billing-simulated-note" role="note"><strong>Thanh toán giả lập — không thu tiền thật.</strong> Bấm Thanh toán chỉ đánh dấu đơn đã trả để thử tính năng tin nổi bật.</p>
      <Card as="section" aria-label="Chi tiết đơn hàng" className="billing-panel billing-checkout">
        <dl className="billing-checkout-summary">
          <div><dt>Tin tuyển dụng</dt><dd>{order.postingTitle}</dd></div>
          <div><dt>Gói</dt><dd>{order.packageName}</dd></div>
          <div><dt>Ngày tạo</dt><dd>{formatDateTime(order.createdAt)}</dd></div>
          <div><dt>Trạng thái</dt><dd><Badge tone={orderStatusTones[order.status]}>{orderStatusLabels[order.status]}</Badge></dd></div>
          {order.featuredUntil ? <div><dt>Nổi bật đến</dt><dd>{formatDateTime(order.featuredUntil)}</dd></div> : null}
          <div className="billing-checkout-total"><dt>Tổng tiền</dt><dd>{formatVnd(order.amountVnd)}</dd></div>
        </dl>
        {order.status === 'PENDING' ? <CheckoutActions orderId={order.id} /> : null}
        {/* The refresh after paying unmounts CheckoutActions (and its message), so the paid state confirms itself. */}
        {order.status === 'PAID' ? <p className="billing-message" role="status">Thanh toán giả lập thành công. Tin của bạn đã được đẩy nổi bật.</p> : null}
      </Card>
      <Link className="clear-search-link" href="/employer/billing">← Về gói dịch vụ</Link>
    </main>
  );
}
