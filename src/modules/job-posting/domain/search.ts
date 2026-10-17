import type { SearchFilter } from '@/modules/shared/types';

/** Search Filter without paging; blank text fields already dropped. employerId: the company page only. */
export type SearchCriteria = Omit<SearchFilter, 'page'> & { employerId?: string };

/**
 * Accent- and case-insensitive form of Vietnamese text ("Kế toán" → "ke toan", "Đ" → "d").
 * Mirrored by public.f_unaccent in supabase/migrations/*_job_search.sql (unaccent + lower).
 */
export function foldAccents(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').replace(/[đĐ]/g, 'd').toLowerCase();
}

/** Spec (Search): salary_max null means negotiable / no upper bound, so it never filters a posting out. */
export function meetsMinSalary(salaryMax: number | null, minSalary: number): boolean {
  return salaryMax === null || salaryMax >= minSalary;
}
