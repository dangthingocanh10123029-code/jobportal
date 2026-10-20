'use server';

import { cache } from 'react';
import { apiFetch } from '@/lib/api';
import { fail, readOr, toAction } from './_shared';
import { firstError } from './auth-schema';
import { postingIdSchema, postingInputSchema, searchFilterSchema } from './postings-schema';
import type {
  ActionResult,
  JobPosting,
  OpenPostingsPage,
  PostingDetail,
  PostingInput,
  PostingSummary,
  SearchFilter,
} from './types';

export async function createPostingDraftAction(input: PostingInput): Promise<ActionResult<JobPosting>> {
  const parsed = postingInputSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error));
  return toAction(await apiFetch('/me/postings', { method: 'POST', body: parsed.data }));
}

export async function updatePostingAction(input: PostingInput & { id: string }): Promise<ActionResult<JobPosting>> {
  const parsed = postingInputSchema.extend({ id: postingIdSchema }).safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error));
  const { id, ...fields } = parsed.data;
  return toAction(await apiFetch(`/me/postings/${id}`, { method: 'PUT', body: fields }));
}

export async function publishPostingAction(input: { id: string }): Promise<ActionResult<JobPosting>> {
  const parsed = postingIdSchema.safeParse(input?.id);
  if (!parsed.success) return fail(firstError(parsed.error));
  return toAction(await apiFetch(`/me/postings/${parsed.data}/publish`, { method: 'POST' }));
}

export async function closePostingAction(input: { id: string }): Promise<ActionResult<JobPosting>> {
  const parsed = postingIdSchema.safeParse(input?.id);
  if (!parsed.success) return fail(firstError(parsed.error));
  return toAction(await apiFetch(`/me/postings/${parsed.data}/close`, { method: 'POST' }));
}

export async function listMyPostings(): Promise<JobPosting[]> {
  return readOr(await apiFetch<JobPosting[]>('/me/postings'), []);
}

export async function getMyPosting(id: string): Promise<JobPosting | null> {
  const parsed = postingIdSchema.safeParse(id);
  if (!parsed.success) return null;
  return readOr(await apiFetch<JobPosting>(`/me/postings/${parsed.data}`), null);
}

// SearchFilter field → query parameter of GET /postings (docs/api-contract.md v3).
const QUERY_NAMES: Record<keyof SearchFilter, string> = {
  q: 'q',
  location: 'location',
  employmentType: 'type',
  minSalary: 'minSalary',
  industry: 'industry',
  level: 'level',
  maxExperience: 'exp',
  skill: 'skill',
  postedWithinDays: 'postedWithinDays',
  sort: 'sort',
  page: 'page',
};

/** Anyone, signed in or not. Malformed or blank filter fields are ignored; invalid page falls back to 1. */
export async function listOpenPostings(filter: SearchFilter): Promise<OpenPostingsPage> {
  const parsed = searchFilterSchema.safeParse(filter);
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(parsed.success ? parsed.data : {})) {
    if (value !== undefined) query.set(QUERY_NAMES[key as keyof SearchFilter], String(value));
  }
  const res = await apiFetch<OpenPostingsPage>(`/postings?${query}`);
  if (!res.ok) throw new Error(`Không đọc được danh sách tin: ${res.error}`);
  return res.data;
}

/** Anyone. DRAFT and unknown ids → null (page shows 404). The API counts a view unless the viewer owns the posting. */
// cache(): generateMetadata and the page share one lookup (and one view count) per request.
export const getPostingDetail = cache(async (id: string): Promise<PostingDetail | null> => {
  const parsed = postingIdSchema.safeParse(id);
  if (!parsed.success) return null;
  const res = await apiFetch<PostingDetail>(`/postings/${parsed.data}`);
  if (res.ok) return res.data;
  if (res.status === 404) return null;
  throw new Error(`Không đọc được tin: ${res.error}`);
});

/** Anyone. ≤ 6 open postings in the same industry, excluding this one; [] for DRAFT or unknown ids. */
export async function getRelatedPostings(postingId: string): Promise<PostingSummary[]> {
  const parsed = postingIdSchema.safeParse(postingId);
  if (!parsed.success) return [];
  return readOr(await apiFetch<PostingSummary[]>(`/postings/${parsed.data}/related`), []);
}
