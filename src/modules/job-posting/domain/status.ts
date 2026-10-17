import type { DisplayPostingStatus, PostingStatus } from '@/modules/shared/types';

// Mirrored by the job_postings_guard trigger in supabase/migrations/*_job_postings.sql.
export const TRANSITIONS = {
  publish: { from: 'DRAFT', to: 'PUBLISHED' },
  close: { from: 'PUBLISHED', to: 'CLOSED' },
} as const satisfies Record<string, { from: PostingStatus; to: PostingStatus }>;

export const EDITABLE: readonly PostingStatus[] = ['DRAFT', 'PUBLISHED'];

/** ADR-0001: EXPIRED = PUBLISHED and deadline already passed. */
export function displayStatus(status: PostingStatus, deadline: string, now: Date): DisplayPostingStatus {
  return status === 'PUBLISHED' && Date.parse(deadline) < now.getTime() ? 'EXPIRED' : status;
}

/** Accepts Applications. Mirrored by the open_job_postings view in supabase/migrations/*_open_job_postings.sql. */
export function isOpen(status: PostingStatus, deadline: string, now: Date): boolean {
  return displayStatus(status, deadline, now) === 'PUBLISHED';
}
