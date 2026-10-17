// Shared types of the API contract (docs/api-contract.md). Domain types live in @/modules/shared/types.

export type * from '@/modules/shared/types';

export type ActionResult<T> = { success: true; data: T } | { success: false; error: string };
