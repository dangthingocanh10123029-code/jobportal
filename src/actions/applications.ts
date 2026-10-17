'use server';

import { apiFetch } from '@/lib/api';
import { fail, readOr, toAction } from './_shared';
import {
  applicationIdSchema,
  changeApplicationStatusSchema,
  resumeUrlSchema,
  submitApplicationSchema,
  withdrawApplicationSchema,
} from './applications-schema';
import { firstError } from './auth-schema';
import { postingIdSchema } from './postings-schema';
import type {
  ActionResult,
  Application,
  ApplicationStatus,
  CandidateApplicationSummary,
  EmployerApplicationSummary,
  StatusChange,
} from './types';

/** FormData fields: postingId, resume (PDF ≤ 5 MB). FastAPI uploads the Resume, then submits atomically. */
export async function submitApplicationAction(formData: FormData): Promise<ActionResult<Application>> {
  if (!(formData instanceof FormData)) return fail('Dữ liệu không hợp lệ');
  const parsed = await submitApplicationSchema.safeParseAsync({
    postingId: formData.get('postingId') ?? '',
    resume: formData.get('resume') ?? undefined,
  });
  if (!parsed.success) return fail(firstError(parsed.error));
  return toAction(await apiFetch('/applications', { method: 'POST', formData }));
}

/** The signed-in Candidate's Application to this posting; null when none, signed out, or not a Candidate. */
export async function getMyApplicationForPosting(postingId: string): Promise<Application | null> {
  const parsed = postingIdSchema.safeParse(postingId);
  if (!parsed.success) return null;
  return readOr(await apiFetch<Application | null>(`/postings/${parsed.data}/my-application`), null);
}

/** The signed-in Candidate's Applications, newest first; empty when not a Candidate. */
export async function listMyApplications(): Promise<CandidateApplicationSummary[]> {
  return readOr(await apiFetch<CandidateApplicationSummary[]>('/me/applications'), []);
}

/** One of the signed-in Candidate's Applications with its Status Change history; null when not theirs. */
export async function getMyApplication(
  id: string,
): Promise<(CandidateApplicationSummary & { history: StatusChange[] }) | null> {
  const parsed = applicationIdSchema.safeParse(id);
  if (!parsed.success) return null;
  return readOr(await apiFetch<CandidateApplicationSummary & { history: StatusChange[] }>(`/me/applications/${parsed.data}`), null);
}

/** Candidate withdraws their own Application unless it is already HIRED, REJECTED or WITHDRAWN. */
export async function withdrawApplicationAction(input: { applicationId: string }): Promise<ActionResult<Application>> {
  const parsed = withdrawApplicationSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error));
  return toAction(await apiFetch(`/me/applications/${parsed.data.applicationId}/withdraw`, { method: 'POST' }));
}

/** Applications on the signed-in Employer's posting, newest first; null when the posting is not theirs. */
export async function listApplicationsForPosting(postingId: string): Promise<EmployerApplicationSummary[] | null> {
  const parsed = postingIdSchema.safeParse(postingId);
  if (!parsed.success) return null;
  return readOr(await apiFetch<EmployerApplicationSummary[]>(`/me/postings/${parsed.data}/applications`), null);
}

/** Employer moves an Application on their posting to a status allowedNextStatuses(status, 'EMPLOYER') lists. */
export async function changeApplicationStatusAction(input: {
  applicationId: string;
  toStatus: ApplicationStatus;
}): Promise<ActionResult<Application>> {
  const parsed = changeApplicationStatusSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error));
  const { applicationId, toStatus } = parsed.data;
  return toAction(await apiFetch(`/applications/${applicationId}/status`, { method: 'POST', body: { toStatus } }));
}

/** Short-lived signed URL of the Resume, only for the Employer owning the Application's posting. */
export async function getResumeUrlAction(input: {
  applicationId: string;
}): Promise<ActionResult<{ url: string; expiresInSeconds: number }>> {
  const parsed = resumeUrlSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error));
  return toAction(await apiFetch(`/applications/${parsed.data.applicationId}/resume-url`));
}
