'use server';

import { apiFetch } from '@/lib/api';
import { fail, toAction } from './_shared';
import { firstError } from './auth-schema';
import { companyFilterSchema, companyIdSchema, companyInputSchema, companyLogoSchema } from './companies-schema';
import type { ActionResult, CompaniesPage, Company, CompanyInput, PostingSummary } from './types';

/** The signed-in Employer's Company; null for anyone else. */
export async function getMyCompany(): Promise<Company | null> {
  const res = await apiFetch<Company>('/me/company');
  return res.ok ? res.data : null;
}

/** Omitted fields stay; an empty string clears about/address/website. The name is mirrored to profiles.company_name. */
export async function updateMyCompanyAction(input: CompanyInput): Promise<ActionResult<Company>> {
  const parsed = companyInputSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error));
  return toAction(await apiFetch<Company>('/me/company', { method: 'PATCH', body: parsed.data }));
}

/** FormData field 'logo': PNG/JPEG/WebP ≤ 1 MB. Replaces the current logo. */
export async function uploadCompanyLogoAction(formData: FormData): Promise<ActionResult<Company>> {
  if (!(formData instanceof FormData)) return fail('Dữ liệu không hợp lệ');
  const parsed = await companyLogoSchema.safeParseAsync(formData.get('logo') ?? undefined);
  if (!parsed.success) return fail(firstError(parsed.error));
  return toAction(await apiFetch<Company>('/me/company/logo', { method: 'POST', formData }));
}

/** Anyone. Name search is accent- and case-insensitive; malformed fields are ignored. */
export async function listCompanies(filter: { q?: string; page?: number }): Promise<CompaniesPage> {
  const parsed = companyFilterSchema.safeParse(filter);
  const { q, page } = parsed.success ? parsed.data : { q: undefined, page: 1 };
  const query = new URLSearchParams({ page: String(page), ...(q && { q }) });
  const res = await apiFetch<CompaniesPage>(`/companies?${query}`);
  if (!res.ok) throw new Error(`Không đọc được danh sách công ty: ${res.error}`);
  return res.data;
}

/** Anyone. Company with its open postings (newest first); null for unknown ids. */
export async function getCompany(id: string): Promise<(Company & { openPostings: PostingSummary[] }) | null> {
  const parsed = companyIdSchema.safeParse(id);
  if (!parsed.success) return null;
  const res = await apiFetch<Company & { openPostings: PostingSummary[] }>(`/companies/${parsed.data}`);
  if (res.ok) return res.data;
  if (res.status === 404) return null;
  throw new Error(`Không đọc được công ty: ${res.error}`);
}
