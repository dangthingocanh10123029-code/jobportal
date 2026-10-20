'use server';

import { apiFetch } from '@/lib/api';
import { fail, readOr, toAction } from './_shared';
import { applicationIdSchema } from './applications-schema';
import { firstError } from './auth-schema';
import {
  cancelInterviewSchema,
  interviewScopeSchema,
  markInterviewDoneSchema,
  respondInterviewSchema,
  scheduleInterviewSchema,
} from './interviews-schema';
import type { ActionResult, Interview, InterviewMode } from './types';

/** Employer of the posting; REVIEWING moves to INTERVIEWING; one PROPOSED/CONFIRMED interview per Application. */
export async function scheduleInterviewAction(input: {
  applicationId: string;
  scheduledAt: string;
  durationMinutes: number;
  mode: InterviewMode;
  location: string;
  note?: string;
}): Promise<ActionResult<Interview>> {
  const parsed = scheduleInterviewSchema.safeParse(input ?? {});
  if (!parsed.success) return fail(firstError(parsed.error));
  const { applicationId, ...body } = parsed.data;
  return toAction(await apiFetch(`/applications/${applicationId}/interviews`, { method: 'POST', body }));
}

/** Candidate of the Application, only while PROPOSED; RESCHEDULE needs a note. */
export async function respondInterviewAction(input: {
  interviewId: string;
  response: 'CONFIRM' | 'DECLINE' | 'RESCHEDULE';
  note?: string;
}): Promise<ActionResult<Interview>> {
  const parsed = respondInterviewSchema.safeParse(input ?? {});
  if (!parsed.success) return fail(firstError(parsed.error));
  const { interviewId, ...body } = parsed.data;
  return toAction(await apiFetch(`/interviews/${interviewId}/respond`, { method: 'POST', body }));
}

/** Employer; PROPOSED, CONFIRMED or RESCHEDULE_REQUESTED. The reason reaches the Candidate in the notification. */
export async function cancelInterviewAction(input: { interviewId: string; reason?: string }): Promise<ActionResult<Interview>> {
  const parsed = cancelInterviewSchema.safeParse(input ?? {});
  if (!parsed.success) return fail(firstError(parsed.error));
  const { interviewId, ...body } = parsed.data;
  return toAction(await apiFetch(`/interviews/${interviewId}/cancel`, { method: 'POST', body }));
}

/** Employer; CONFIRMED and the scheduled time has come. */
export async function markInterviewDoneAction(input: { interviewId: string }): Promise<ActionResult<Interview>> {
  const parsed = markInterviewDoneSchema.safeParse(input ?? {});
  if (!parsed.success) return fail(firstError(parsed.error));
  return toAction(await apiFetch(`/interviews/${parsed.data.interviewId}/done`, { method: 'POST' }));
}

/** The signed-in user's interviews (either role). upcoming (default): soonest first; past: latest first. [] when signed out. */
export async function listMyInterviews(filter: { scope?: 'upcoming' | 'past' } = {}): Promise<Interview[]> {
  const scope = interviewScopeSchema.catch('upcoming').parse(filter?.scope);
  return readOr(await apiFetch<Interview[]>(`/me/interviews?scope=${scope}`), []);
}

/** Latest first; null unless the caller is the Application's Candidate or its posting's Employer. */
export async function listInterviewsForApplication(applicationId: string): Promise<Interview[] | null> {
  const parsed = applicationIdSchema.safeParse(applicationId);
  if (!parsed.success) return null;
  return readOr(await apiFetch<Interview[]>(`/applications/${parsed.data}/interviews`), null);
}
