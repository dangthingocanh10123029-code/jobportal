import { z } from 'zod';
import { skillsSchema } from './postings-schema';

// Kept in sync with the profiles CHECKs in supabase/migrations/*_candidate_profile_saved.sql.
// Contract: an empty string clears the field (FastAPI stores null; it rejects null itself).
const clearable = (label: string, max: number) =>
  z
    .string({ invalid_type_error: `${label} không hợp lệ` })
    .trim()
    .max(max, `${label} tối đa ${max} ký tự`);

export const candidateProfileInputSchema = z.object({
  headline: clearable('Tiêu đề hồ sơ', 150).optional(),
  skills: skillsSchema(20).optional(),
  experience: clearable('Kinh nghiệm', 5000).optional(),
  education: clearable('Học vấn', 5000).optional(),
});

export const toggleSavedPostingSchema = z.object({
  postingId: z.string({ invalid_type_error: 'Mã tin không hợp lệ' }).uuid('Mã tin không hợp lệ'),
});
