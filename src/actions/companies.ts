'use server';

import { createSupabaseServerClient, getCurrentActor } from '@/lib/supabase-server';
import { CompanyService, type CompanyId } from '@/modules/company';
import { SupabaseCompanyRepository } from '@/modules/company/adapters/supabase';
import { JobPostingService, type EmployerId } from '@/modules/job-posting';
import { SupabaseJobPostingRepository } from '@/modules/job-posting/adapters/supabase';
import { firstError } from './auth-schema';
import { companyFilterSchema, companyIdSchema, companyInputSchema, companyLogoSchema } from './companies-schema';
import type { ActionResult, CompaniesPage, Company, CompanyInput, PostingSummary } from './types';

const fail = (error: string) => ({ success: false, error }) as const;

const LOGO_BUCKET = 'company-logos';

/** Service for the signed-in Employer's own Company, or null for anyone else. */
async function employerContext() {
  const supabase = await createSupabaseServerClient();
  const actor = await getCurrentActor(supabase);
  if (actor?.role !== 'EMPLOYER') return null;
  return {
    supabase,
    service: new CompanyService(new SupabaseCompanyRepository(supabase)),
    companyId: actor.userId as CompanyId,
  };
}

async function publicService() {
  return new CompanyService(new SupabaseCompanyRepository(await createSupabaseServerClient()));
}

/** The signed-in Employer's Company; null for anyone else. */
export async function getMyCompany(): Promise<Company | null> {
  const ctx = await employerContext();
  return ctx ? ctx.service.get(ctx.companyId) : null;
}

/** Omitted fields stay; an empty string clears about/address/website. The name is mirrored to profiles.company_name. */
export async function updateMyCompanyAction(input: CompanyInput): Promise<ActionResult<Company>> {
  const parsed = companyInputSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error));

  const ctx = await employerContext();
  if (!ctx) return fail('Chỉ nhà tuyển dụng đã đăng nhập mới sửa được hồ sơ công ty');
  try {
    const company = await ctx.service.update(ctx.companyId, parsed.data);
    return company ? { success: true, data: company } : fail('Không tìm thấy hồ sơ công ty');
  } catch (error) {
    console.error(error);
    return fail('Có lỗi xảy ra, vui lòng thử lại');
  }
}

/** FormData field 'logo': PNG/JPEG/WebP ≤ 1 MB. Replaces the current logo. */
export async function uploadCompanyLogoAction(formData: FormData): Promise<ActionResult<Company>> {
  if (!(formData instanceof FormData)) return fail('Dữ liệu không hợp lệ');
  const parsed = await companyLogoSchema.safeParseAsync(formData.get('logo') ?? undefined);
  if (!parsed.success) return fail(firstError(parsed.error));

  const ctx = await employerContext();
  if (!ctx) return fail('Chỉ nhà tuyển dụng đã đăng nhập mới tải được logo');
  const { supabase, service, companyId } = ctx;

  // The folder must be the Employer's id (Storage policy, companies.logo_url CHECK). A fresh name per upload
  // means the public URL changes, so no CDN cache serves the old logo.
  const { file, ext } = parsed.data;
  const path = `${companyId}/${crypto.randomUUID()}.${ext}`;
  const logos = supabase.storage.from(LOGO_BUCKET);
  const upload = await logos.upload(path, file, { contentType: file.type });
  if (upload.error) {
    console.error(upload.error);
    return fail('Không tải được logo lên, vui lòng thử lại');
  }

  try {
    const previous = (await service.get(companyId))?.logoUrl ?? null;
    const company = await service.update(companyId, { logoUrl: logos.getPublicUrl(path).data.publicUrl });
    if (!company) {
      await logos.remove([path]);
      return fail('Không tìm thấy hồ sơ công ty');
    }
    // Old logo is no longer referenced. Best effort.
    const previousPath = previous?.split(`/${LOGO_BUCKET}/`)[1];
    if (previousPath) await logos.remove([decodeURIComponent(previousPath)]);
    return { success: true, data: company };
  } catch (error) {
    await logos.remove([path]);
    console.error(error);
    return fail('Có lỗi xảy ra, vui lòng thử lại');
  }
}

/** Anyone. Name search is accent- and case-insensitive; malformed fields are ignored. */
export async function listCompanies(filter: { q?: string; page?: number }): Promise<CompaniesPage> {
  return (await publicService()).list(companyFilterSchema.parse(filter));
}

/** Anyone. Company with its open postings (newest first); null for unknown ids. */
export async function getCompany(id: string): Promise<(Company & { openPostings: PostingSummary[] }) | null> {
  const parsed = companyIdSchema.safeParse(id);
  if (!parsed.success) return null;
  const supabase = await createSupabaseServerClient();
  const company = await new CompanyService(new SupabaseCompanyRepository(supabase)).get(parsed.data as CompanyId);
  if (!company) return null;
  const postings = new JobPostingService(new SupabaseJobPostingRepository(supabase));
  return { ...company, openPostings: await postings.listOpenByEmployer(company.id as EmployerId) };
}
