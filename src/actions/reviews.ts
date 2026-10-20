'use server';

import { apiFetch } from '@/lib/api';
import { fail, readOr, toAction } from './_shared';
import { firstError } from './auth-schema';
import { reviewIdSchema, submitReviewSchema } from './reviews-schema';
import type { ActionResult, CompanyRating, CompanyReview, MyReview, Page } from './types';

export type CompanyReviewsPage = { rating: CompanyRating } & Page<CompanyReview, 10>;

const EMPTY_RATING: CompanyRating = { average: null, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };

/** APPROVED reviews only, newest first, 10 per page. */
export async function listCompanyReviews(companyId: string, page = 1): Promise<CompanyReviewsPage> {
  const empty: CompanyReviewsPage = { rating: EMPTY_RATING, items: [], total: 0, page: 1, pageSize: 10 };
  if (!reviewIdSchema.safeParse(companyId).success) return empty;
  const safePage = Number.isInteger(page) && page >= 1 && page <= 1000 ? page : 1;
  return readOr(await apiFetch<CompanyReviewsPage>(`/companies/${companyId}/reviews?page=${safePage}`, { auth: false }), empty);
}

/** The caller's review of the company (any status); null for guests, Employers, Admins or no review. */
export async function getMyReview(companyId: string): Promise<MyReview | null> {
  if (!reviewIdSchema.safeParse(companyId).success) return null;
  return readOr(await apiFetch<MyReview | null>(`/companies/${companyId}/my-review`), null);
}

/** Candidate who ever applied to one of the company's postings and has no review yet. */
export async function canReviewCompany(companyId: string): Promise<boolean> {
  if (!reviewIdSchema.safeParse(companyId).success) return false;
  return readOr(await apiFetch<boolean>(`/companies/${companyId}/can-review`), false);
}

/** New review → PENDING; rewriting a REJECTED one sends it back to PENDING; one review per company. */
export async function submitReviewAction(input: {
  companyId: string; rating: number; title: string; pros: string; cons: string; anonymous: boolean;
}): Promise<ActionResult<MyReview>> {
  const parsed = submitReviewSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error));
  const { companyId, ...body } = parsed.data;
  return toAction(await apiFetch<MyReview>(`/companies/${companyId}/my-review`, { method: 'POST', body }));
}
