// Helpers for the Server Action files. Deliberately not 'use server': nothing here may be callable from the client.
import type { ApiResult } from '@/lib/api';
import type { ActionResult } from './types';

export const fail = (error: string) => ({ success: false, error }) as const;

// Zod still rejects bad input in the action, so forms get the same messages without a round trip; FastAPI re-checks.
export const toAction = <T>(res: ApiResult<T>): ActionResult<T> => (res.ok ? { success: true, data: res.data } : fail(res.error));
