'use server';

import { apiFetch } from '@/lib/api';
import { fail, readOr, toAction } from './_shared';
import { applicationIdSchema } from './applications-schema';
import { firstError } from './auth-schema';
import { cvSchema } from './cv-schema';
import type { ActionResult, OnlineCv } from './types';

/** The signed-in Candidate's online CV; null when none yet, signed out, or not a Candidate. */
export async function getMyCv(): Promise<OnlineCv | null> {
  return readOr(await apiFetch<OnlineCv | null>('/me/cv'), null);
}

/** Creates or replaces the Candidate's online CV. Applications already submitted keep their snapshot. */
export async function saveMyCvAction(input: Omit<OnlineCv, 'candidateId' | 'updatedAt'>): Promise<ActionResult<OnlineCv>> {
  const parsed = cvSchema.safeParse(input ?? {});
  if (!parsed.success) return fail(firstError(parsed.error));
  return toAction(await apiFetch('/me/cv', { method: 'PUT', body: parsed.data }));
}

export async function deleteMyCvAction(): Promise<ActionResult<null>> {
  const res = await apiFetch('/me/cv', { method: 'DELETE' });
  return res.ok ? { success: true, data: null } : fail(res.error);
}

/** Employer of the posting: the CV snapshot taken at submit; null for a PDF Application or when not theirs. */
export async function getApplicationCv(applicationId: string): Promise<OnlineCv | null> {
  const parsed = applicationIdSchema.safeParse(applicationId);
  if (!parsed.success) return null;
  return readOr(await apiFetch<OnlineCv | null>(`/applications/${parsed.data}/cv`), null);
}
