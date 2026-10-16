'use server';

import { createSupabaseServerClient, getCurrentActor } from '@/lib/supabase-server';
import { JobPostingError, JobPostingService, type EmployerId, type JobPostingId } from '@/modules/job-posting';
import { SupabaseJobPostingRepository } from '@/modules/job-posting/adapters/supabase';
import { firstError } from './auth-schema';
import { postingIdSchema, postingInputSchema } from './postings-schema';
import type { ActionResult, JobPosting, PostingInput } from './types';

const fail = (error: string) => ({ success: false, error }) as const;

/** Service for the signed-in Employer, or null for anyone else. */
async function employerContext() {
  const supabase = await createSupabaseServerClient();
  const actor = await getCurrentActor(supabase);
  if (actor?.role !== 'EMPLOYER') return null;
  return {
    service: new JobPostingService(new SupabaseJobPostingRepository(supabase)),
    employerId: actor.userId as EmployerId,
  };
}

async function run(
  work: (ctx: NonNullable<Awaited<ReturnType<typeof employerContext>>>) => Promise<JobPosting>,
): Promise<ActionResult<JobPosting>> {
  const ctx = await employerContext();
  if (!ctx) return fail('Chỉ nhà tuyển dụng đã đăng nhập mới thực hiện được thao tác này');
  try {
    return { success: true, data: await work(ctx) };
  } catch (error) {
    if (error instanceof JobPostingError) return fail(error.message);
    console.error(error);
    return fail('Có lỗi xảy ra, vui lòng thử lại');
  }
}

export async function createPostingDraftAction(input: PostingInput): Promise<ActionResult<JobPosting>> {
  const parsed = postingInputSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error));
  return run(({ service, employerId }) => service.createDraft(employerId, parsed.data));
}

export async function updatePostingAction(input: PostingInput & { id: string }): Promise<ActionResult<JobPosting>> {
  const parsed = postingInputSchema.extend({ id: postingIdSchema }).safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error));
  const { id, ...fields } = parsed.data;
  return run(({ service, employerId }) => service.update(employerId, id as JobPostingId, fields));
}

export async function publishPostingAction(input: { id: string }): Promise<ActionResult<JobPosting>> {
  const parsed = postingIdSchema.safeParse(input?.id);
  if (!parsed.success) return fail(firstError(parsed.error));
  return run(({ service, employerId }) => service.publish(employerId, parsed.data as JobPostingId));
}

export async function closePostingAction(input: { id: string }): Promise<ActionResult<JobPosting>> {
  const parsed = postingIdSchema.safeParse(input?.id);
  if (!parsed.success) return fail(firstError(parsed.error));
  return run(({ service, employerId }) => service.close(employerId, parsed.data as JobPostingId));
}

export async function listMyPostings(): Promise<JobPosting[]> {
  const ctx = await employerContext();
  return ctx ? ctx.service.listMine(ctx.employerId) : [];
}

export async function getMyPosting(id: string): Promise<JobPosting | null> {
  const parsed = postingIdSchema.safeParse(id);
  if (!parsed.success) return null;
  const ctx = await employerContext();
  return ctx ? ctx.service.getMine(ctx.employerId, parsed.data as JobPostingId) : null;
}
