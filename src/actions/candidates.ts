'use server';

import { createSupabaseServerClient, getCurrentActor } from '@/lib/supabase-server';
import { CandidateService, type CandidateId } from '@/modules/candidate';
import { SupabaseCandidateRepository } from '@/modules/candidate/adapters/supabase';
import type { EmployerId, JobPostingId } from '@/modules/job-posting';
import { applicationIdSchema } from './applications-schema';
import { firstError } from './auth-schema';
import { candidateProfileInputSchema, toggleSavedPostingSchema } from './candidates-schema';
import type { ActionResult, CandidateProfile, CandidateProfileInput, SavedPostingSummary } from './types';

const fail = (error: string) => ({ success: false, error }) as const;

/** Service plus the signed-in user's id when they have `role`, or null for anyone else. */
async function context(role: 'CANDIDATE' | 'EMPLOYER') {
  const supabase = await createSupabaseServerClient();
  const actor = await getCurrentActor(supabase);
  if (actor?.role !== role) return null;
  return { service: new CandidateService(new SupabaseCandidateRepository(supabase)), userId: actor.userId };
}

/** The signed-in Candidate's profile; null for anyone else. */
export async function getMyCandidateProfile(): Promise<CandidateProfile | null> {
  const ctx = await context('CANDIDATE');
  return ctx ? ctx.service.getProfile(ctx.userId as CandidateId) : null;
}

/** Omitted fields stay; an empty string clears headline/experience/education. */
export async function updateCandidateProfileAction(input: CandidateProfileInput): Promise<ActionResult<CandidateProfile>> {
  const parsed = candidateProfileInputSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error));

  const ctx = await context('CANDIDATE');
  if (!ctx) return fail('Chỉ ứng viên đã đăng nhập mới sửa được hồ sơ');
  try {
    const profile = await ctx.service.updateProfile(ctx.userId as CandidateId, parsed.data);
    return profile ? { success: true, data: profile } : fail('Không tìm thấy hồ sơ ứng viên');
  } catch (error) {
    console.error(error);
    return fail('Có lỗi xảy ra, vui lòng thử lại');
  }
}

/** Profile of the Candidate behind an Application; null unless the signed-in Employer owns its posting. */
export async function getApplicantProfile(applicationId: string): Promise<CandidateProfile | null> {
  const parsed = applicationIdSchema.safeParse(applicationId);
  if (!parsed.success) return null;
  const ctx = await context('EMPLOYER');
  return ctx ? ctx.service.getApplicantProfile(ctx.userId as EmployerId, parsed.data) : null;
}

/** Saved → unsaved, otherwise saved. Only PUBLISHED/CLOSED postings can be saved. */
export async function toggleSavedPostingAction(input: { postingId: string }): Promise<ActionResult<{ saved: boolean }>> {
  const parsed = toggleSavedPostingSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error));

  const ctx = await context('CANDIDATE');
  if (!ctx) return fail('Chỉ ứng viên đã đăng nhập mới lưu được tin');
  try {
    const result = await ctx.service.toggleSaved(ctx.userId as CandidateId, parsed.data.postingId as JobPostingId);
    return result ? { success: true, data: result } : fail('Không tìm thấy tin tuyển dụng');
  } catch (error) {
    console.error(error);
    return fail('Có lỗi xảy ra, vui lòng thử lại');
  }
}

/** Most recently saved first; [] for anyone but a Candidate. */
export async function listSavedPostings(): Promise<SavedPostingSummary[]> {
  const ctx = await context('CANDIDATE');
  return ctx ? ctx.service.listSaved(ctx.userId as CandidateId) : [];
}

/** [] for anyone but a Candidate. */
export async function getSavedPostingIds(): Promise<string[]> {
  const ctx = await context('CANDIDATE');
  return ctx ? ctx.service.listSavedIds(ctx.userId as CandidateId) : [];
}
