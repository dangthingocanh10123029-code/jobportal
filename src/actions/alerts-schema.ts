import { z } from 'zod';
import { EMPLOYMENT_TYPES, INDUSTRIES, LEVELS } from './postings-schema';

// Same rules and messages as backend/app/modules/alerts/schemas.py; = job_alert_filter_valid() in *_job_alerts.sql.
const INVALID = 'Dữ liệu không hợp lệ';
const id = z.string({ invalid_type_error: 'Mã thông báo không hợp lệ', required_error: 'Mã thông báo không hợp lệ' })
  .uuid('Mã thông báo không hợp lệ');
/** Blank → dropped; otherwise trimmed 1–100. */
const optionalText = (label: string) => {
  const message = `${label} từ 1 đến 100 ký tự`;
  return z.preprocess(
    (v) => (v == null || (typeof v === 'string' && !v.trim()) ? undefined : v),
    z.string({ invalid_type_error: message }).trim().max(100, message).optional(),
  );
};
const oneOf = <T extends readonly [string, ...string[]]>(values: T) =>
  z.enum(values, { errorMap: () => ({ message: INVALID }) }).nullish().transform((v) => v ?? undefined);

export const alertFilterSchema = z
  .object({
    q: optionalText('Từ khóa'),
    location: optionalText('Địa điểm'),
    employmentType: oneOf(EMPLOYMENT_TYPES),
    industry: oneOf(INDUSTRIES),
    level: oneOf(LEVELS),
    minSalary: z.number({ invalid_type_error: 'Lương tối thiểu phải là số' }).int('Lương tối thiểu phải là số nguyên')
      .min(1, 'Lương tối thiểu phải lớn hơn 0').max(Number.MAX_SAFE_INTEGER, INVALID).nullish().transform((v) => v ?? undefined),
  }, { invalid_type_error: INVALID, required_error: INVALID })
  .strict(INVALID)
  .refine((f) => Object.values(f).some((v) => v !== undefined), 'Bộ lọc cần ít nhất 1 điều kiện');

export const createJobAlertSchema = z.object({
  name: z.string({ invalid_type_error: 'Tên thông báo từ 1 đến 100 ký tự', required_error: 'Tên thông báo từ 1 đến 100 ký tự' })
    .trim().min(1, 'Tên thông báo từ 1 đến 100 ký tự').max(100, 'Tên thông báo từ 1 đến 100 ký tự'),
  filter: alertFilterSchema,
});

export const updateJobAlertSchema = z.object({
  id,
  active: z.boolean({ invalid_type_error: INVALID, required_error: INVALID }),
});

export const deleteJobAlertSchema = z.object({ id });
