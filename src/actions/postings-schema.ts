import { z } from 'zod';

// Kept in sync with the CHECK constraints in supabase/migrations/*_job_postings.sql.
const salary = z
  .number({ invalid_type_error: 'Lương phải là số' })
  .int('Lương phải là số nguyên')
  .nonnegative('Lương không được âm')
  .nullable();

export const postingInputSchema = z.object({
  title: z
    .string({ required_error: 'Vui lòng nhập tiêu đề' })
    .trim()
    .min(5, 'Tiêu đề tối thiểu 5 ký tự')
    .max(150, 'Tiêu đề tối đa 150 ký tự'),
  description: z.string({ required_error: 'Vui lòng nhập mô tả' }).trim().min(20, 'Mô tả tối thiểu 20 ký tự'),
  location: z
    .string({ required_error: 'Vui lòng nhập địa điểm' })
    .trim()
    .min(1, 'Vui lòng nhập địa điểm')
    .max(100, 'Địa điểm tối đa 100 ký tự'),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'CONTRACT'], {
    errorMap: () => ({ message: 'Loại hình công việc không hợp lệ' }),
  }),
  salaryMin: salary,
  salaryMax: salary,
  // Offset required: a bare "2026-10-20T10:00" would be read in the server's timezone.
  applicationDeadline: z
    .string({ required_error: 'Vui lòng nhập hạn nộp hồ sơ' })
    .datetime({ offset: true, message: 'Hạn nộp hồ sơ không hợp lệ' })
    .transform((s) => new Date(s).toISOString()),
});

export const postingIdSchema = z.string().uuid('Mã tin không hợp lệ');
