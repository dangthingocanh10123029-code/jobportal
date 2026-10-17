// Helpers for the Server Action files. Deliberately not 'use server': nothing here may be callable from the client.
import type { ApiResult } from '@/lib/api';
import type { ActionResult } from './types';

export const fail = (error: string) => ({ success: false, error }) as const;

// Zod still rejects bad input in the action, so forms get the same messages without a round trip; FastAPI re-checks.
export const toAction = <T>(res: ApiResult<T>): ActionResult<T> => (res.ok ? { success: true, data: res.data } : fail(res.error));

/** Reads: 4xx (signed out, wrong role, not found) → `empty`; 5xx throws so Next shows the error page, not an empty list. */
export function readOr<T, E>(res: ApiResult<T>, empty: E): T | E {
  if (res.ok) return res.data;
  if (res.status >= 500) throw new Error(res.error);
  return empty;
}
