import { describe, expect, it } from 'vitest';
import { adminOrderFilterSchema, createOrderSchema, orderIdSchema, savePackageSchema } from './billing-schema';

const ID = '00000000-0000-4000-8000-0000000000e1';
const valid = { code: 'TOP_7', name: 'Tin nổi bật 7 ngày', description: '', priceVnd: 299000, durationDays: 7, active: true };
const firstError = (input: unknown) => {
  const parsed = savePackageSchema.safeParse(input);
  return parsed.success ? null : parsed.error.issues[0].message;
};

describe('savePackageSchema', () => {
  it('trims texts and defaults the description', () => {
    const { description: _, ...rest } = valid;
    expect(savePackageSchema.parse({ ...rest, id: ID, name: '  Tin nổi bật 7 ngày ' })).toEqual({ ...valid, id: ID });
  });

  it.each([
    [{ code: 'top_7' }, 'Mã gói gồm A–Z, 0–9, _ (2–30 ký tự)'],
    [{ code: 'T' }, 'Mã gói gồm A–Z, 0–9, _ (2–30 ký tự)'],
    [{ code: 'A'.repeat(31) }, 'Mã gói gồm A–Z, 0–9, _ (2–30 ký tự)'],
    [{ name: ' a ' }, 'Tên gói cần từ 2 đến 100 ký tự'],
    [{ description: 'x'.repeat(501) }, 'Mô tả tối đa 500 ký tự'],
    [{ priceVnd: -1 }, 'Giá từ 0 đến 100.000.000 đ'],
    [{ priceVnd: 100_000_001 }, 'Giá từ 0 đến 100.000.000 đ'],
    [{ priceVnd: 1.5 }, 'Giá phải là số nguyên'],
    [{ durationDays: 0 }, 'Thời hạn từ 1 đến 90 ngày'],
    [{ durationDays: 91 }, 'Thời hạn từ 1 đến 90 ngày'],
    [{ active: 'yes' }, 'Dữ liệu không hợp lệ'],
    [{ id: 'abc' }, 'Mã gói không hợp lệ'],
  ])('rejects %o', (patch, message) => {
    expect(firstError({ ...valid, ...patch })).toBe(message);
  });
});

describe('order schemas', () => {
  it('need uuids', () => {
    expect(createOrderSchema.safeParse({ packageId: ID, postingId: ID }).success).toBe(true);
    const parsed = createOrderSchema.safeParse({ packageId: ID });
    expect(parsed.success ? null : parsed.error.issues[0].message).toBe('Vui lòng chọn tin');
    expect(orderIdSchema.safeParse({ orderId: 'x' }).success).toBe(false);
  });

  it('drops malformed admin filters', () => {
    expect(adminOrderFilterSchema.parse({ status: 'REFUNDED', page: '-1' })).toEqual({ status: undefined, page: 1 });
    expect(adminOrderFilterSchema.parse({ status: 'PAID', page: '2' })).toEqual({ status: 'PAID', page: 2 });
  });
});
