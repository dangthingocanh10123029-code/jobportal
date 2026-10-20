import { z } from 'zod';
import { pageSchema } from './postings-schema';

// Same rules and messages as backend/app/modules/talent/schemas.py; sizes = the *_talent.sql CHECKs.
const uuid = (message: string) => z.string({ invalid_type_error: message, required_error: message }).uuid(message);
/** Missing stays missing; null or blank → null; otherwise trimmed 1–max. */
const optionalText = (label: string, max: number) => {
  const message = `${label} từ 1 đến ${max} ký tự`;
  return z.preprocess(
    (v) => (typeof v === 'string' && !v.trim() ? null : v),
    z.string({ invalid_type_error: message }).trim().max(max, message).nullable().optional(),
  );
};
const YEARS_ERROR = 'Số năm kinh nghiệm từ 0 đến 50';
const candidateId = uuid('Mã ứng viên không hợp lệ');

export const setOpenToWorkSchema = z.object({
  openToWork: z.boolean({ invalid_type_error: 'Dữ liệu không hợp lệ', required_error: 'Dữ liệu không hợp lệ' }),
  location: optionalText('Địa điểm', 150),
  experienceYears: z.number({ invalid_type_error: YEARS_ERROR }).int(YEARS_ERROR).min(0, YEARS_ERROR).max(50, YEARS_ERROR).optional(),
});

export const talentIdSchema = candidateId;

export const toggleSavedTalentSchema = z.object({ candidateId, note: optionalText('Ghi chú', 500) });

export const inviteTalentSchema = z.object({
  candidateId,
  postingId: uuid('Mã tin không hợp lệ'),
  message: optionalText('Lời nhắn', 1000),
});

// Filters come from the URL: a malformed field means "no filter", never an error.
const loose = <T extends z.ZodTypeAny>(schema: T) => schema.optional().catch(undefined);
const text = loose(z.string().trim().transform((s) => s.slice(0, 100) || undefined));

export const talentFilterSchema = z
  .object({
    q: text,
    skill: text,
    location: text,
    minExperience: loose(z.coerce.number().int().min(0).max(50)),
    page: pageSchema,
  })
  .catch({ page: 1 });
