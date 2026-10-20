import { describe, expect, it } from 'vitest';
import { adminReviewFilterSchema, moderateReviewSchema, submitReviewSchema } from './reviews-schema';

const COMPANY = '00000000-0000-4000-8000-0000000000e1';
const valid = { companyId: COMPANY, rating: 4, title: 'Môi trường tốt', pros: 'Đồng nghiệp thân thiện', cons: 'Lương hơi thấp', anonymous: false };
const firstError = (input: unknown) => {
  const parsed = submitReviewSchema.safeParse(input);
  return parsed.success ? null : parsed.error.issues[0].message;
};

describe('submitReviewSchema', () => {
  it('trims the texts', () => {
    expect(submitReviewSchema.parse({ ...valid, title: '  Môi trường tốt ' })).toEqual(valid);
  });

  it.each([
    [{ rating: 0 }, 'Vui lòng chọn từ 1 đến 5 sao'],
    [{ rating: 6 }, 'Vui lòng chọn từ 1 đến 5 sao'],
    [{ rating: 4.5 }, 'Vui lòng chọn từ 1 đến 5 sao'],
    [{ rating: undefined }, 'Vui lòng chọn số sao'],
    [{ title: ' abcd ' }, 'Tiêu đề cần từ 5 đến 150 ký tự'],
    [{ title: 'x'.repeat(151) }, 'Tiêu đề cần từ 5 đến 150 ký tự'],
    [{ pros: 'ngắn' }, 'Ưu điểm cần từ 10 đến 3.000 ký tự'],
    [{ cons: 'x'.repeat(3001) }, 'Nhược điểm cần từ 10 đến 3.000 ký tự'],
    [{ companyId: 'abc' }, 'Mã công ty không hợp lệ'],
    [{ anonymous: 'yes' }, 'Dữ liệu đánh giá không hợp lệ'],
  ])('rejects %o', (patch, message) => {
    expect(firstError({ ...valid, ...patch })).toBe(message);
  });
});

describe('moderateReviewSchema', () => {
  it('needs a 5–500 reason only to reject, and drops it when approving', () => {
    expect(moderateReviewSchema.parse({ reviewId: COMPANY, approve: true, reason: 'x' })).toEqual({ reviewId: COMPANY, approve: true });
    expect(moderateReviewSchema.parse({ reviewId: COMPANY, approve: false, reason: '  Nội dung sai  ' })).toEqual({ reviewId: COMPANY, approve: false, reason: 'Nội dung sai' });
    for (const reason of [undefined, ' abc ', 'x'.repeat(501)]) {
      const parsed = moderateReviewSchema.safeParse({ reviewId: COMPANY, approve: false, reason });
      expect(parsed.success ? null : parsed.error.issues[0].message).toBe('Lý do cần từ 5 đến 500 ký tự');
    }
    expect(moderateReviewSchema.safeParse({ reviewId: 'abc', approve: true }).success).toBe(false);
  });

  it('drops malformed admin filters', () => {
    expect(adminReviewFilterSchema.parse({ status: 'HIDDEN', page: '-1' })).toEqual({ status: undefined, page: 1 });
    expect(adminReviewFilterSchema.parse({ status: 'PENDING', page: '2' })).toEqual({ status: 'PENDING', page: 2 });
  });
});
