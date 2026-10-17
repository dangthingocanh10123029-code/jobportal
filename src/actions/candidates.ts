'use server';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApplicationId } from '@/modules/application';
import { CandidateService } from '@/modules/candidate';
import { SupabaseCandidateRepository } from '@/modules/candidate/adapters/supabase';
import type { JobPostingId } from '@/modules/job-posting';
import { fail, requireCandidate, requireEmployer } from './_shared';
import { applicationIdSchema } from './applications-schema';
import { firstError } from './auth-schema';
import { candidateProfileInputSchema, toggleSavedPostingSchema } from './candidates-schema';
import type { ActionResult, CandidateProfile, CandidateProfileInput, SavedPostingSummary } from './types';

const service = (supabase: SupabaseClient) => new CandidateService(new SupabaseCandidateRepository(supabase));

/** The signed-in Candidate's profile; null for anyone else. */
export async function getMyCandidateProfile(): Promise<CandidateProfile | null> {
  const ctx = await requireCandidate();
  return ctx ? service(ctx.supabase).getProfile(ctx.candidateId) : null;
}

/** Omitted fields stay; an empty string clears headline/experience/education. */
export async function updateCandidateProfileAction(input: CandidateProfileInput): Promise<ActionResult<CandidateProfile>> {
  const parsed = candidateProfileInputSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error));

  const ctx = await requireCandidate();
  if (!ctx) return fail('Chỉ ứng viên đã đăng nhập mới sửa được hồ sơ');
  try {
    const profile = await service(ctx.supabase).updateProfile(ctx.candidateId, parsed.data);
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
  const ctx = await requireEmployer();
  return ctx ? service(ctx.supabase).getApplicantProfile(ctx.employerId, parsed.data as ApplicationId) : null;
}

/** Saved → unsaved, otherwise saved. Only PUBLISHED/CLOSED postings can be saved. */
export async function toggleSavedPostingAction(input: { postingId: string }): Promise<ActionResult<{ saved: boolean }>> {
  const parsed = toggleSavedPostingSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error));

  const ctx = await requireCandidate();
  if (!ctx) return fail('Chỉ ứng viên đã đăng nhập mới lưu được tin');
  try {
    const result = await service(ctx.supabase).toggleSaved(ctx.candidateId, parsed.data.postingId as JobPostingId);
    return result ? { success: true, data: result } : fail('Không tìm thấy tin tuyển dụng');
  } catch (error) {
    console.error(error);
    return fail('Có lỗi xảy ra, vui lòng thử lại');
  }
}

/** Most recently saved first; [] for anyone but a Candidate. */
export async function listSavedPostings(): Promise<SavedPostingSummary[]> {
  const ctx = await requireCandidate();
  return ctx ? service(ctx.supabase).listSaved(ctx.candidateId) : [];
}

/** [] for anyone but a Candidate. */
export async function getSavedPostingIds(): Promise<string[]> {
  const ctx = await requireCandidate();
  return ctx ? service(ctx.supabase).listSavedIds(ctx.candidateId) : [];
}
