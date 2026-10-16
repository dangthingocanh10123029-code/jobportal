import { z } from 'zod';
import { postingIdSchema } from './postings-schema';

// Kept in sync with the resumes bucket file_size_limit in supabase/migrations/*_applications.sql.
// Plain constant (not a 'use server' file) so the form can check the size client-side too.
export const MAX_RESUME_BYTES = 5 * 1024 * 1024;

export const applicationIdSchema = z
  .string({ required_error: 'Mã hồ sơ không hợp lệ', invalid_type_error: 'Mã hồ sơ không hợp lệ' })
  .uuid('Mã hồ sơ không hợp lệ');

export const withdrawApplicationSchema = z.object({ applicationId: applicationIdSchema });

const PDF_MAGIC = '%PDF-';

export const submitApplicationSchema = z.object({
  postingId: postingIdSchema,
  resume: z
    .instanceof(File, { message: 'Vui lòng chọn file CV' })
    .refine((file) => file.size > 0, 'Vui lòng chọn file CV')
    .refine((file) => file.type === 'application/pdf', 'CV phải là file PDF')
    .refine((file) => file.size <= MAX_RESUME_BYTES, 'CV tối đa 5 MB')
    // The declared type comes from the client; the first bytes do not lie.
    .refine(async (file) => (await file.slice(0, PDF_MAGIC.length).text()) === PDF_MAGIC, 'CV phải là file PDF'),
});
