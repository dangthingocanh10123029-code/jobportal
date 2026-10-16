'use server';

import { createSupabaseServerClient, getCurrentActor } from '@/lib/supabase-server';
import { ApplicationError, ApplicationService, type ApplicationId, type CandidateId } from '@/modules/application';
import { SupabaseApplicationRepository } from '@/modules/application/adapters/supabase';
import type { JobPostingId } from '@/modules/job-posting';
import { applicationIdSchema, submitApplicationSchema, withdrawApplicationSchema } from './applications-schema';
import { firstError } from './auth-schema';
import { postingIdSchema } from './postings-schema';
import type { ActionResult, Application, CandidateApplicationSummary, StatusChange } from './types';

const fail = (error: string) => ({ success: false, error }) as const;

/** Service for the signed-in Candidate, or null for anyone else. */
async function candidateContext() {
  const supabase = await createSupabaseServerClient();
  const actor = await getCurrentActor(supabase);
  if (actor?.role !== 'CANDIDATE') return null;
  return {
    supabase,
    service: new ApplicationService(new SupabaseApplicationRepository(supabase)),
    candidateId: actor.userId as CandidateId,
  };
}

/** FormData fields: postingId, resume (PDF ≤ 5 MB). Uploads the Resume, then submits atomically. */
export async function submitApplicationAction(formData: FormData): Promise<ActionResult<Application>> {
  if (!(formData instanceof FormData)) return fail('Dữ liệu không hợp lệ');
  const parsed = await submitApplicationSchema.safeParseAsync({
    postingId: formData.get('postingId') ?? '',
    resume: formData.get('resume') ?? undefined,
  });
  if (!parsed.success) return fail(firstError(parsed.error));

  const ctx = await candidateContext();
  if (!ctx) return fail('Chỉ ứng viên đã đăng nhập mới nộp được hồ sơ');
  const { supabase, service, candidateId } = ctx;

  // The folder must be the Candidate's id: Storage policy and submit_application both check it.
  const path = `${candidateId}/${crypto.randomUUID()}.pdf`;
  const resumes = supabase.storage.from('resumes');
  const upload = await resumes.upload(path, parsed.data.resume, { contentType: 'application/pdf' });
  if (upload.error) {
    console.error(upload.error);
    return fail('Không tải được CV lên, vui lòng thử lại');
  }

  try {
    return { success: true, data: await service.submit(candidateId, parsed.data.postingId as JobPostingId, path) };
  } catch (error) {
    // Refused submit (e.g. double click, posting just closed): drop the orphan upload. Best effort.
    await resumes.remove([path]);
    if (error instanceof ApplicationError) return fail(error.message);
    console.error(error);
    return fail('Có lỗi xảy ra, vui lòng thử lại');
  }
}

/** The signed-in Candidate's Application to this posting; null when none, signed out, or not a Candidate. */
export async function getMyApplicationForPosting(postingId: string): Promise<Application | null> {
  const parsed = postingIdSchema.safeParse(postingId);
  if (!parsed.success) return null;
  const ctx = await candidateContext();
  return ctx ? ctx.service.getMine(ctx.candidateId, parsed.data as JobPostingId) : null;
}

/** The signed-in Candidate's Applications, newest first; empty when not a Candidate. */
export async function listMyApplications(): Promise<CandidateApplicationSummary[]> {
  const ctx = await candidateContext();
  return ctx ? ctx.service.listMine(ctx.candidateId) : [];
}

/** One of the signed-in Candidate's Applications with its Status Change history; null when not theirs. */
export async function getMyApplication(
  id: string,
): Promise<(CandidateApplicationSummary & { history: StatusChange[] }) | null> {
  const parsed = applicationIdSchema.safeParse(id);
  if (!parsed.success) return null;
  const ctx = await candidateContext();
  return ctx ? ctx.service.getMineWithHistory(ctx.candidateId, parsed.data as ApplicationId) : null;
}

/** Candidate withdraws their own Application unless it is already HIRED, REJECTED or WITHDRAWN. */
export async function withdrawApplicationAction(input: { applicationId: string }): Promise<ActionResult<Application>> {
  const parsed = withdrawApplicationSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error));

  const ctx = await candidateContext();
  if (!ctx) return fail('Chỉ ứng viên đã đăng nhập mới rút được hồ sơ');

  try {
    return { success: true, data: await ctx.service.withdraw(ctx.candidateId, parsed.data.applicationId as ApplicationId) };
  } catch (error) {
    if (error instanceof ApplicationError) return fail(error.message);
    console.error(error);
    return fail('Có lỗi xảy ra, vui lòng thử lại');
  }
}
