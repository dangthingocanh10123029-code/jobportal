'use server';

import { apiFetch } from '@/lib/api';
import { fail, readOr, toAction } from './_shared';
import { createJobAlertSchema, deleteJobAlertSchema, updateJobAlertSchema } from './alerts-schema';
import { firstError } from './auth-schema';
import type { ActionResult, AlertFilter, JobAlert, RecommendedPosting } from './types';

/** Candidate: up to 10 open postings not yet applied to, best match first. [] for guests and Employers. */
export async function getRecommendedPostings(): Promise<RecommendedPosting[]> {
  return readOr(await apiFetch<RecommendedPosting[]>('/me/recommendations'), []);
}

/** Candidate's own alerts, newest first; [] for anyone else. */
export async function listJobAlerts(): Promise<JobAlert[]> {
  return readOr(await apiFetch<JobAlert[]>('/me/job-alerts'), []);
}

/** At most 5 per Candidate; blank filter fields are dropped and at least one must remain. */
export async function createJobAlertAction(input: { name: string; filter: AlertFilter }): Promise<ActionResult<JobAlert>> {
  const parsed = createJobAlertSchema.safeParse(input ?? {});
  if (!parsed.success) return fail(firstError(parsed.error));
  return toAction(await apiFetch<JobAlert>('/me/job-alerts', { method: 'POST', body: parsed.data }));
}

export async function updateJobAlertAction(input: { id: string; active: boolean }): Promise<ActionResult<JobAlert>> {
  const parsed = updateJobAlertSchema.safeParse(input ?? {});
  if (!parsed.success) return fail(firstError(parsed.error));
  const { id, active } = parsed.data;
  return toAction(await apiFetch<JobAlert>(`/me/job-alerts/${id}`, { method: 'PATCH', body: { active } }));
}

export async function deleteJobAlertAction(input: { id: string }): Promise<ActionResult<null>> {
  const parsed = deleteJobAlertSchema.safeParse(input ?? {});
  if (!parsed.success) return fail(firstError(parsed.error));
  const res = await apiFetch(`/me/job-alerts/${parsed.data.id}`, { method: 'DELETE' });
  return res.ok ? { success: true, data: null } : fail(res.error);
}
