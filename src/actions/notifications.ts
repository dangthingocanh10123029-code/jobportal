'use server';

import { apiFetch } from '@/lib/api';
import { fail } from './_shared';
import { firstError } from './auth-schema';
import { markNotificationsReadSchema } from './notifications-schema';
import type { ActionResult, AppNotification } from './types';

/** 30 newest; [] when signed out. */
export async function listMyNotifications(): Promise<AppNotification[]> {
  const res = await apiFetch<AppNotification[]>('/me/notifications');
  return res.ok ? res.data : [];
}

/** 0 when signed out. */
export async function getUnreadNotificationCount(): Promise<number> {
  const res = await apiFetch<number>('/me/notifications/unread-count');
  return res.ok ? res.data : 0;
}

/** Empty or missing ids = mark every notification read. */
export async function markNotificationsReadAction(input: { ids?: string[] }): Promise<ActionResult<null>> {
  const parsed = markNotificationsReadSchema.safeParse(input ?? {});
  if (!parsed.success) return fail(firstError(parsed.error));
  const res = await apiFetch('/me/notifications/read', { method: 'POST', body: parsed.data });
  return res.ok ? { success: true, data: null } : fail(res.error);
}
