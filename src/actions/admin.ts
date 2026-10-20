'use server';

import { apiFetch } from '@/lib/api';
import { fail, readOr, toAction } from './_shared';
import {
  adminCompanyFilterSchema,
  adminIdSchema,
  adminPostingFilterSchema,
  adminUserFilterSchema,
  auditFilterSchema,
  setCompanyVerifiedSchema,
  setPostingHiddenSchema,
  setUserLockSchema,
  toQuery,
} from './admin-schema';
import { firstError } from './auth-schema';
import { adminReviewFilterSchema, moderateReviewSchema } from './reviews-schema';
import type {
  ActionResult,
  AdminCompany,
  AdminPosting,
  AdminReview,
  AdminStats,
  AdminUser,
  AdminUserDetail,
  AuditAction,
  AuditEntry,
  DisplayPostingStatus,
  Page,
  ReviewStatus,
  Role,
} from './types';

// Every function: not ADMIN → null (reads) / the API's 403 message (writes). FastAPI and the database re-check.

export async function getAdminStats(): Promise<AdminStats | null> {
  return readOr(await apiFetch<AdminStats>('/admin/stats'), null);
}

export async function listAdminUsers(filter: { q?: string; role?: Role; locked?: boolean; page?: number }): Promise<Page<AdminUser> | null> {
  return readOr(await apiFetch<Page<AdminUser>>(`/admin/users?${toQuery(adminUserFilterSchema.parse(filter))}`), null);
}

export async function getAdminUser(userId: string): Promise<AdminUserDetail | null> {
  const parsed = adminIdSchema.safeParse(userId);
  if (!parsed.success) return null;
  return readOr(await apiFetch<AdminUserDetail>(`/admin/users/${parsed.data}`), null);
}

/** Locking needs a 5–500 character reason; nobody can lock themselves or another Admin. */
export async function setUserLockAction(input: { userId: string; locked: boolean; reason?: string }): Promise<ActionResult<AdminUser>> {
  const parsed = setUserLockSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error));
  const { userId, ...body } = parsed.data;
  return toAction(await apiFetch<AdminUser>(`/admin/users/${userId}/lock`, { method: 'POST', body }));
}

export async function listAdminPostings(filter: {
  q?: string;
  status?: DisplayPostingStatus;
  hidden?: boolean;
  employerId?: string;
  page?: number;
}): Promise<Page<AdminPosting> | null> {
  return readOr(await apiFetch<Page<AdminPosting>>(`/admin/postings?${toQuery(adminPostingFilterSchema.parse(filter))}`), null);
}

/** Hiding needs a 5–500 character reason and notifies the Employer; existing Applications stay. */
export async function setPostingHiddenAction(input: { postingId: string; hidden: boolean; reason?: string }): Promise<ActionResult<AdminPosting>> {
  const parsed = setPostingHiddenSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error));
  const { postingId, ...body } = parsed.data;
  return toAction(await apiFetch<AdminPosting>(`/admin/postings/${postingId}/hidden`, { method: 'POST', body }));
}

export async function listAdminCompanies(filter: { q?: string; verified?: boolean; page?: number }): Promise<Page<AdminCompany> | null> {
  return readOr(await apiFetch<Page<AdminCompany>>(`/admin/companies?${toQuery(adminCompanyFilterSchema.parse(filter))}`), null);
}

export async function setCompanyVerifiedAction(input: { companyId: string; verified: boolean }): Promise<ActionResult<AdminCompany>> {
  const parsed = setCompanyVerifiedSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error));
  const { companyId, verified } = parsed.data;
  return toAction(await apiFetch<AdminCompany>(`/admin/companies/${companyId}/verified`, { method: 'POST', body: { verified } }));
}

export async function listAuditLog(filter: { action?: AuditAction; actorId?: string; page?: number }): Promise<Page<AuditEntry> | null> {
  return readOr(await apiFetch<Page<AuditEntry>>(`/admin/audit?${toQuery(auditFilterSchema.parse(filter))}`), null);
}

/** Every review, newest first, 10 per page. */
export async function listAdminReviews(filter: { status?: ReviewStatus; page?: number }): Promise<Page<AdminReview, 10> | null> {
  return readOr(await apiFetch<Page<AdminReview, 10>>(`/admin/reviews?${toQuery(adminReviewFilterSchema.parse(filter))}`), null);
}

/** Rejecting needs a 5–500 character reason; writes the audit entry and notifies the author (REVIEW_MODERATED). */
export async function moderateReviewAction(input: { reviewId: string; approve: boolean; reason?: string }): Promise<ActionResult<null>> {
  const parsed = moderateReviewSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error));
  const { reviewId, ...body } = parsed.data;
  return toAction(await apiFetch<null>(`/admin/reviews/${reviewId}/moderate`, { method: 'POST', body }));
}
