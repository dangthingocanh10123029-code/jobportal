import { z } from 'zod';
import { pageSchema } from './postings-schema';
import type { OrderStatus } from './types';

// Kept in sync with the service_packages CHECKs (supabase/migrations/*_billing.sql) and the FastAPI service.
const STATUSES = ['PENDING', 'PAID', 'CANCELLED'] as const satisfies readonly OrderStatus[];
const INVALID = 'Dữ liệu không hợp lệ';

const id = (label: string) =>
  z.string({ invalid_type_error: `Mã ${label} không hợp lệ`, required_error: `Vui lòng chọn ${label}` }).uuid(`Mã ${label} không hợp lệ`);
const int = (label: string, min: number, max: number, unit: string) =>
  z
    .number({ invalid_type_error: `${label} phải là số`, required_error: `Vui lòng nhập ${label.toLowerCase()}` })
    .int(`${label} phải là số nguyên`)
    .min(min, `${label} từ ${min.toLocaleString('vi-VN')} đến ${max.toLocaleString('vi-VN')} ${unit}`)
    .max(max, `${label} từ ${min.toLocaleString('vi-VN')} đến ${max.toLocaleString('vi-VN')} ${unit}`);

export const billingIdSchema = z.string().uuid();

export const createOrderSchema = z.object({ packageId: id('gói'), postingId: id('tin') });

export const orderIdSchema = z.object({ orderId: id('đơn hàng') });

export const savePackageSchema = z.object({
  id: id('gói').optional(),
  code: z
    .string({ invalid_type_error: 'Mã gói không hợp lệ', required_error: 'Vui lòng nhập mã gói' })
    .trim()
    .regex(/^[A-Z0-9_]{2,30}$/, 'Mã gói gồm A–Z, 0–9, _ (2–30 ký tự)'),
  name: z
    .string({ invalid_type_error: 'Tên gói không hợp lệ', required_error: 'Vui lòng nhập tên gói' })
    .trim()
    .min(2, 'Tên gói cần từ 2 đến 100 ký tự')
    .max(100, 'Tên gói cần từ 2 đến 100 ký tự'),
  description: z.string({ invalid_type_error: 'Mô tả không hợp lệ' }).trim().max(500, 'Mô tả tối đa 500 ký tự').default(''),
  priceVnd: int('Giá', 0, 100_000_000, 'đ'),
  durationDays: int('Thời hạn', 1, 90, 'ngày'),
  active: z.boolean({ invalid_type_error: INVALID, required_error: INVALID }),
});

// URL filters: anything malformed is dropped, never an error page.
export const adminOrderFilterSchema = z
  .object({ status: z.enum(STATUSES).optional().catch(undefined), page: pageSchema })
  .catch({ status: undefined, page: 1 });
