import type { OrderStatus } from '@/actions/types';

export const orderStatusLabels: Record<OrderStatus, string> = { PENDING: 'Chờ thanh toán', PAID: 'Đã thanh toán', CANCELLED: 'Đã hủy' };
export const orderStatusTones = { PENDING: 'warning', PAID: 'success', CANCELLED: 'neutral' } as const;

export function formatVnd(value: number) {
  return `${new Intl.NumberFormat('vi-VN').format(value)} ₫`;
}
