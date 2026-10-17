import { z } from 'zod';
import { pageSchema } from './postings-schema';
import type { AuditAction, DisplayPostingStatus, Role } from './types';

// Kept in sync with admin_reason() in supabase/migrations/*_admin.sql and REASON_MIN/MAX in FastAPI.
const REASON_ERROR = 'Lý do cần từ 5 đến 500 ký tự';
const reason = z.string({ invalid_type_error: REASON_ERROR, required_error: REASON_ERROR }).trim().min(5, REASON_ERROR).max(500, REASON_ERROR);

const id = (label: string) => z.string({ invalid_type_error: `Mã ${label} không hợp lệ` }).uuid(`Mã ${label} không hợp lệ`);
export const adminIdSchema = z.string().uuid();

const ROLES = ['CANDIDATE', 'EMPLOYER', 'ADMIN'] as const satisfies readonly Role[];
const STATUSES = ['DRAFT', 'PUBLISHED', 'CLOSED', 'EXPIRED'] as const satisfies readonly DisplayPostingStatus[];
const ACTIONS = [
  'USER_LOCKED', 'USER_UNLOCKED', 'POSTING_HIDDEN', 'POSTING_UNHIDDEN', 'COMPANY_VERIFIED', 'COMPANY_UNVERIFIED',
] as const satisfies readonly AuditAction[];

// Locking/hiding needs a reason; undoing it does not (any reason sent is dropped).
export const setUserLockSchema = z.discriminatedUnion(
  'locked',
  [
    z.object({ userId: id('người dùng'), locked: z.literal(true), reason }),
    z.object({ userId: id('người dùng'), locked: z.literal(false) }),
  ],
  { errorMap: () => ({ message: 'Dữ liệu không hợp lệ' }) },
);

export const setPostingHiddenSchema = z.discriminatedUnion(
  'hidden',
  [
    z.object({ postingId: id('tin'), hidden: z.literal(true), reason }),
    z.object({ postingId: id('tin'), hidden: z.literal(false) }),
  ],
  { errorMap: () => ({ message: 'Dữ liệu không hợp lệ' }) },
);

export const setCompanyVerifiedSchema = z.object({
  companyId: id('công ty'),
  verified: z.boolean({ invalid_type_error: 'Dữ liệu không hợp lệ', required_error: 'Dữ liệu không hợp lệ' }),
});

// Filters come from the URL: a malformed field means "no filter", never an error.
const loose = <T extends z.ZodTypeAny>(schema: T) => schema.optional().catch(undefined);
const text = loose(z.string().trim().transform((s) => s.slice(0, 100) || undefined));
const flag = loose(z.union([z.boolean(), z.enum(['true', 'false']).transform((s) => s === 'true')]));

export const adminUserFilterSchema = z
  .object({ q: text, role: loose(z.enum(ROLES)), locked: flag, page: pageSchema })
  .catch({ page: 1 });

export const adminPostingFilterSchema = z
  .object({ q: text, status: loose(z.enum(STATUSES)), hidden: flag, employerId: loose(adminIdSchema), page: pageSchema })
  .catch({ page: 1 });

export const adminCompanyFilterSchema = z.object({ q: text, verified: flag, page: pageSchema }).catch({ page: 1 });

export const auditFilterSchema = z
  .object({ action: loose(z.enum(ACTIONS)), actorId: loose(adminIdSchema), page: pageSchema })
  .catch({ page: 1 });

/** Defined fields as a query string (page always present). */
export function toQuery(filter: Record<string, string | number | boolean | undefined>): string {
  const entries = Object.entries(filter).filter(([, v]) => v !== undefined) as [string, string | number | boolean][];
  return new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}
