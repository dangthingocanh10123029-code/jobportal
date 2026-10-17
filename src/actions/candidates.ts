'use server';

import { apiFetch } from '@/lib/api';
import { fail, readOr, toAction } from './_shared';
import { applicationIdSchema } from './applications-schema';
import { firstError } from './auth-schema';
import { candidateProfileInputSchema, toggleSavedPostingSchema } from './candidates-schema';
import type { ActionResult, CandidateProfile, CandidateProfileInput, SavedPostingSummary } from './types';

/** The signed-in Candidate's profile; null for anyone else. */
export async function getMyCandidateProfile(): Promise<CandidateProfile | null> {
  return readOr(await apiFetch<CandidateProfile>('/me/candidate-profile'), null);
}

/** Omitted fields stay; an empty string clears headline/experience/education. */
export async function updateCandidateProfileAction(input: CandidateProfileInput): Promise<ActionResult<CandidateProfile>> {
  const parsed = candidateProfileInputSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error));
  return toAction(await apiFetch<CandidateProfile>('/me/candidate-profile', { method: 'PATCH', body: parsed.data }));
}

/** Profile of the Candidate behind an Application; null unless the signed-in Employer owns its posting. */
export async function getApplicantProfile(applicationId: string): Promise<CandidateProfile | null> {
  const parsed = applicationIdSchema.safeParse(applicationId);
  if (!parsed.success) return null;
  return readOr(await apiFetch<CandidateProfile>(`/applications/${parsed.data}/applicant`), null);
}

/** Saved → unsaved, otherwise saved. Only PUBLISHED/CLOSED postings can be saved. */
export async function toggleSavedPostingAction(input: { postingId: string }): Promise<ActionResult<{ saved: boolean }>> {
  const parsed = toggleSavedPostingSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error));
  return toAction(await apiFetch<{ saved: boolean }>(`/me/saved-postings/${parsed.data.postingId}/toggle`, { method: 'POST' }));
}

/** Most recently saved first; [] for anyone but a Candidate. */
export async function listSavedPostings(): Promise<SavedPostingSummary[]> {
  return readOr(await apiFetch<SavedPostingSummary[]>('/me/saved-postings'), []);
}

/** [] for anyone but a Candidate. */
export async function getSavedPostingIds(): Promise<string[]> {
  return readOr(await apiFetch<string[]>('/me/saved-postings/ids'), []);
}
