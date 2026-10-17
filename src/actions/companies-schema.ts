import { z } from 'zod';
import { pageSchema } from './postings-schema';
import type { CompanySize } from './types';

// Kept in sync with the companies CHECKs and the company-logos bucket in supabase/migrations/*_companies.sql.
// Plain constant (not a 'use server' file) so the form can check the size client-side too.
export const MAX_LOGO_BYTES = 1024 * 1024;

const SIZES = ['S1_10', 'S11_50', 'S51_200', 'S201_500', 'S500_PLUS'] as const satisfies readonly CompanySize[];

// Contract: an empty string clears the field.
const clearable = (label: string, max: number) =>
  z
    .string({ invalid_type_error: `${label} không hợp lệ` })
    .trim()
    .max(max, `${label} tối đa ${max} ký tự`)
    .transform((s) => s || null);

const isHttpUrl = (s: string) => {
  if (!/^https?:\/\/[^\s/]/i.test(s)) return false;
  try {
    return Boolean(new URL(s).hostname);
  } catch {
    return false;
  }
};

export const companyInputSchema = z.object({
  name: z
    .string({ invalid_type_error: 'Tên công ty không hợp lệ' })
    .trim()
    .min(1, 'Vui lòng nhập tên công ty')
    .max(150, 'Tên công ty tối đa 150 ký tự')
    .optional(),
  about: clearable('Giới thiệu', 5000).optional(),
  size: z.enum(SIZES, { errorMap: () => ({ message: 'Quy mô công ty không hợp lệ' }) }).nullable().optional(),
  address: clearable('Địa chỉ', 300).optional(),
  website: clearable('Website', 300)
    .refine((s) => s === null || isHttpUrl(s), 'Website phải bắt đầu bằng http:// hoặc https://')
    .optional(),
});

// Declared type → extension and the file signature it must start with ('?' = any byte).
const LOGO_TYPES: Record<string, { ext: string; magic: (number | '?')[] }> = {
  'image/png': { ext: 'png', magic: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  'image/jpeg': { ext: 'jpg', magic: [0xff, 0xd8, 0xff] },
  // "RIFF" <size> "WEBP"
  'image/webp': { ext: 'webp', magic: [0x52, 0x49, 0x46, 0x46, '?', '?', '?', '?', 0x57, 0x45, 0x42, 0x50] },
};

export const companyLogoSchema = z
  .instanceof(File, { message: 'Vui lòng chọn file logo' })
  .refine((file) => file.size > 0, 'Vui lòng chọn file logo')
  .refine((file) => Object.hasOwn(LOGO_TYPES, file.type), 'Logo phải là ảnh PNG, JPEG hoặc WebP')
  .refine((file) => file.size <= MAX_LOGO_BYTES, 'Logo tối đa 1 MB')
  // The declared type comes from the client; the first bytes do not lie.
  .refine(async (file) => {
    if (!Object.hasOwn(LOGO_TYPES, file.type)) return true; // already reported above; zod runs every refine
    const { magic } = LOGO_TYPES[file.type];
    const head = new Uint8Array(await file.slice(0, magic.length).arrayBuffer());
    return head.length === magic.length && magic.every((b, i) => b === '?' || head[i] === b);
  }, 'Logo phải là ảnh PNG, JPEG hoặc WebP')
  .transform((file) => ({ file, ext: LOGO_TYPES[file.type].ext }));

export const companyIdSchema = z.string().uuid('Mã công ty không hợp lệ');

// From the URL: a malformed field means "no filter", never an error.
export const companyFilterSchema = z
  .object({
    q: z
      .string()
      .trim()
      .transform((s) => s.slice(0, 100) || undefined)
      .optional()
      .catch(undefined),
    page: pageSchema,
  })
  .catch({ page: 1 });
