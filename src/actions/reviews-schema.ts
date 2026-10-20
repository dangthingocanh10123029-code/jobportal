import { z } from 'zod';
import { pageSchema } from './postings-schema';
import type { ReviewStatus } from './types';

// Kept in sync with the company_reviews CHECKs (supabase/migrations/*_company_reviews.sql) and the FastAPI service.
const STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const satisfies readonly ReviewStatus[];
const REVIEW_ERROR = 'Dữ liệu đánh giá không hợp lệ';
const REASON_ERROR = 'Lý do cần từ 5 đến 500 ký tự';

export const reviewIdSchema = z.string().uuid();

const text = (label: string, min: number, max: number) =>
  z
    .string({ invalid_type_error: `${label} không hợp lệ`, required_error: `Vui lòng nhập ${label.toLowerCase()}` })
    .trim()
    .min(min, `${label} cần từ ${min} đến ${max.toLocaleString('vi-VN')} ký tự`)
    .max(max, `${label} cần từ ${min} đến ${max.toLocaleString('vi-VN')} ký tự`);

export const submitReviewSchema = z.object({
  companyId: z.string({ invalid_type_error: 'Mã công ty không hợp lệ' }).uuid('Mã công ty không hợp lệ'),
  rating: z.number({ invalid_type_error: 'Vui lòng chọn số sao', required_error: 'Vui lòng chọn số sao' })
    .int('Vui lòng chọn từ 1 đến 5 sao').min(1, 'Vui lòng chọn từ 1 đến 5 sao').max(5, 'Vui lòng chọn từ 1 đến 5 sao'),
  title: text('Tiêu đề', 5, 150),
  pros: text('Ưu điểm', 10, 3000),
  cons: text('Nhược điểm', 10, 3000),
  anonymous: z.boolean({ invalid_type_error: REVIEW_ERROR, required_error: REVIEW_ERROR }),
});

// Rejecting needs a reason; approving drops any reason sent.
export const moderateReviewSchema = z.discriminatedUnion(
  'approve',
  [
    z.object({ reviewId: reviewIdSchema, approve: z.literal(true) }),
    z.object({
      reviewId: reviewIdSchema,
      approve: z.literal(false),
      reason: z.string({ invalid_type_error: REASON_ERROR, required_error: REASON_ERROR }).trim().min(5, REASON_ERROR).max(500, REASON_ERROR),
    }),
  ],
  { errorMap: () => ({ message: 'Dữ liệu không hợp lệ' }) },
);

// URL filters: anything malformed is dropped, never an error page.
export const adminReviewFilterSchema = z
  .object({ status: z.enum(STATUSES).optional().catch(undefined), page: pageSchema })
  .catch({ status: undefined, page: 1 });
