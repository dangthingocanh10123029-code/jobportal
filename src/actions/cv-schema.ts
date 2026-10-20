import { z } from 'zod';

// Same rules and messages as CvInput in backend/app/modules/cv/schemas.py; sizes = the candidate_cvs CHECKs.
const text = (label: string, max: number) => {
  const message = `${label} từ 1 đến ${max} ký tự`;
  return z.string({ required_error: message, invalid_type_error: message }).trim().min(1, message).max(max, message);
};
const pattern = (label: string, regex: RegExp) => {
  const message = `${label} không hợp lệ`;
  return z.string({ required_error: message, invalid_type_error: message }).trim().regex(regex, message);
};
/** Missing, null or blank → null. */
const optional = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v == null || (typeof v === 'string' && !v.trim()) ? null : v), schema.nullable());
const list = <T extends z.ZodTypeAny>(item: T, max: number, label: string) => z.array(item).max(max, `Tối đa ${max} ${label}`);

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const YEAR_ERROR = 'Năm cấp không hợp lệ';

const cvItem = z.object({
  title: text('Tên vị trí / ngành học', 150),
  organization: text('Tên công ty / trường', 150),
  startDate: pattern('Tháng bắt đầu', MONTH),
  endDate: optional(pattern('Tháng kết thúc', MONTH)),
  description: z.string().trim().max(2000, 'Mô tả tối đa 2000 ký tự').default(''),
});

export const cvSchema = z.object({
  template: z.enum(['CLASSIC', 'MODERN'], { errorMap: () => ({ message: 'Mẫu CV không hợp lệ' }) }),
  fullName: text('Họ tên', 100),
  headline: optional(text('Chức danh', 150)),
  email: pattern('Email', /^(?=.{3,254}$)[^@\s]+@[^@\s]+\.[^@\s]+$/),
  phone: optional(pattern('Số điện thoại', /^\+?[0-9 .-]{8,20}$/)),
  location: optional(text('Địa chỉ', 150)),
  summary: optional(text('Giới thiệu', 2000)),
  experiences: list(cvItem, 15, 'kinh nghiệm'),
  educations: list(cvItem, 15, 'học vấn'),
  skills: list(text('Kỹ năng', 30), 30, 'kỹ năng'),
  languages: list(text('Ngoại ngữ', 30), 10, 'ngoại ngữ'),
  certifications: list(
    z.object({
      name: text('Tên chứng chỉ', 150),
      issuer: optional(text('Nơi cấp', 150)),
      year: optional(z.number({ invalid_type_error: YEAR_ERROR }).int(YEAR_ERROR).min(1950, YEAR_ERROR).max(2100, YEAR_ERROR)),
    }),
    15,
    'chứng chỉ',
  ),
});
