'use server';

import { apiFetch } from '@/lib/api';
import { fail, readOr, toAction } from './_shared';
import { toQuery } from './admin-schema';
import { firstError } from './auth-schema';
import { inviteTalentSchema, setOpenToWorkSchema, talentFilterSchema, talentIdSchema, toggleSavedTalentSchema } from './talent-schema';
import type { ActionResult, Page, TalentDetail, TalentFilter, TalentSummary } from './types';

/** Candidate: show or hide the profile in Employer talent search. Omitted location/experienceYears stay. */
export async function setOpenToWorkAction(input: {
  openToWork: boolean;
  location?: string;
  experienceYears?: number;
}): Promise<ActionResult<{ openToWork: boolean }>> {
  const parsed = setOpenToWorkSchema.safeParse(input ?? {});
  if (!parsed.success) return fail(firstError(parsed.error));
  return toAction(await apiFetch('/me/open-to-work', { method: 'POST', body: parsed.data }));
}

/** Employer: open-to-work, unlocked Candidates, newest profile first; null for anyone else. */
export async function searchTalent(filter: TalentFilter): Promise<Page<TalentSummary> | null> {
  return readOr(await apiFetch<Page<TalentSummary>>(`/talent?${toQuery(talentFilterSchema.parse(filter ?? {}))}`), null);
}

/** Employer: null when the Candidate is not open to work, locked or unknown. Never has email/phone. */
export async function getTalent(candidateId: string): Promise<TalentDetail | null> {
  const parsed = talentIdSchema.safeParse(candidateId);
  if (!parsed.success) return null;
  return readOr(await apiFetch<TalentDetail>(`/talent/${parsed.data}`), null);
}

/** Saved → unsaved, otherwise saved (with an optional private note). */
export async function toggleSavedTalentAction(input: { candidateId: string; note?: string }): Promise<ActionResult<{ saved: boolean }>> {
  const parsed = toggleSavedTalentSchema.safeParse(input ?? {});
  if (!parsed.success) return fail(firstError(parsed.error));
  const { candidateId, note } = parsed.data;
  return toAction(await apiFetch(`/talent/${candidateId}/save`, { method: 'POST', body: { note } }));
}

/** Most recently saved first; Candidates no longer open to work are left out. [] for anyone but an Employer. */
export async function listSavedTalent(): Promise<TalentSummary[]> {
  return readOr(await apiFetch<TalentSummary[]>('/me/saved-talent'), []);
}

/** Into one of the Employer's open postings; once per (Candidate, posting); at most 20 per 24 hours. */
export async function inviteTalentAction(input: { candidateId: string; postingId: string; message?: string }): Promise<ActionResult<null>> {
  const parsed = inviteTalentSchema.safeParse(input ?? {});
  if (!parsed.success) return fail(firstError(parsed.error));
  const { candidateId, ...body } = parsed.data;
  const res = await apiFetch(`/talent/${candidateId}/invite`, { method: 'POST', body });
  return res.ok ? { success: true, data: null } : fail(res.error);
}
