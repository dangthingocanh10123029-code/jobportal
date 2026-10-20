import { z } from 'zod';

import type { Industry, JobLevel, PostingSort } from './types';

export const EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'CONTRACT'] as const;
export const INDUSTRIES = [
  'IT_SOFTWARE', 'SALES', 'MARKETING', 'ACCOUNTING_FINANCE', 'HR', 'ADMIN', 'CUSTOMER_SERVICE', 'EDUCATION',
  'HEALTHCARE', 'CONSTRUCTION', 'MANUFACTURING', 'LOGISTICS', 'HOSPITALITY', 'DESIGN', 'LEGAL', 'OTHER',
] as const satisfies readonly Industry[];
export const LEVELS = ['INTERN', 'FRESHER', 'JUNIOR', 'MIDDLE', 'SENIOR', 'LEAD', 'MANAGER'] as const satisfies readonly JobLevel[];
const SORTS = ['newest', 'salary_desc', 'deadline_asc'] as const satisfies readonly PostingSort[];

// Kept in sync with the CHECK constraints in supabase/migrations/*_job_postings.sql and *_rich_postings.sql.
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
  employmentType: z.enum(EMPLOYMENT_TYPES, { errorMap: () => ({ message: 'Loại hình công việc không hợp lệ' }) }),
  salaryMin: salary,
  salaryMax: salary,
  // Offset required: a bare "2026-10-20T10:00" would be read in the server's timezone.
  applicationDeadline: z
    .string({ required_error: 'Vui lòng nhập hạn nộp hồ sơ' })
    .datetime({ offset: true, message: 'Hạn nộp hồ sơ không hợp lệ' })
    .transform((s) => new Date(s).toISOString()),
  industry: z.enum(INDUSTRIES, { errorMap: () => ({ message: 'Ngành nghề không hợp lệ' }) }),
  level: z.enum(LEVELS, { errorMap: () => ({ message: 'Cấp bậc không hợp lệ' }) }),
  experienceYears: z
    .number({ invalid_type_error: 'Số năm kinh nghiệm phải là số' })
    .int('Số năm kinh nghiệm phải là số nguyên')
    .min(0, 'Số năm kinh nghiệm không được âm')
    .max(20, 'Số năm kinh nghiệm tối đa 20'),
  headcount: z
    .number({ invalid_type_error: 'Số lượng tuyển phải là số' })
    .int('Số lượng tuyển phải là số nguyên')
    .min(1, 'Số lượng tuyển tối thiểu 1')
    .max(999, 'Số lượng tuyển tối đa 999'),
  skills: skillsSchema(10),
  requirements: longText('Yêu cầu'),
  benefits: longText('Quyền lợi'),
});

/** Mirrored by valid_skills / valid_profile_skills in supabase/migrations. */
export function skillsSchema(max: number) {
  return z
    .array(z.string().trim().min(1, 'Kỹ năng không được để trống').max(30, 'Mỗi kỹ năng tối đa 30 ký tự'))
    .max(max, `Tối đa ${max} kỹ năng`)
    .refine((skills) => new Set(skills.map((s) => s.toLowerCase())).size === skills.length, 'Kỹ năng bị trùng');
}

function longText(label: string) {
  return z
    .string({ required_error: `Vui lòng nhập ${label.toLowerCase()}` })
    .trim()
    .min(10, `${label} tối thiểu 10 ký tự`)
    .max(5000, `${label} tối đa 5000 ký tự`);
}

export const postingIdSchema = z.string().uuid('Mã tin không hợp lệ');

const MAX_PAGE = 1000;

// From ?page= in the URL: anything that is not a positive integer means page 1; huge pages clamp to MAX_PAGE.
export const pageSchema = z.coerce
  .number()
  .int()
  .min(1)
  .catch(1)
  .transform((n) => Math.min(n, MAX_PAGE));

// Search Filter straight from the URL: a missing, blank or malformed field means "no filter", never an error.
const text = z
  .string()
  .trim()
  .transform((s) => s.slice(0, 100) || undefined)
  .optional()
  .catch(undefined);

export const searchFilterSchema = z
  .object({
    q: text,
    location: text,
    employmentType: z.enum(EMPLOYMENT_TYPES).optional().catch(undefined),
    minSalary: z.coerce.number().int().positive().safe().optional().catch(undefined),
    industry: z.enum(INDUSTRIES).optional().catch(undefined),
    level: z.enum(LEVELS).optional().catch(undefined),
    maxExperience: z.coerce.number().int().min(0).max(20).optional().catch(undefined),
    skill: text,
    sort: z.enum(SORTS).optional().catch(undefined),
    page: pageSchema,
  })
  .catch({ page: 1 });
