'use server';

import { createSupabaseServerClient, getCurrentActor } from '@/lib/supabase-server';
import { NotificationService, type RecipientId } from '@/modules/notification';
import { SupabaseNotificationRepository } from '@/modules/notification/adapters/supabase';
import { firstError } from './auth-schema';
import { markNotificationsReadSchema } from './notifications-schema';
import type { ActionResult, AppNotification } from './types';

const fail = (error: string) => ({ success: false, error }) as const;

/** Service plus the signed-in user's id, or null when signed out. */
async function context() {
  const supabase = await createSupabaseServerClient();
  const actor = await getCurrentActor(supabase);
  if (!actor) return null;
  return { service: new NotificationService(new SupabaseNotificationRepository(supabase)), userId: actor.userId as RecipientId };
}

/** 30 newest; [] when signed out. */
export async function listMyNotifications(): Promise<AppNotification[]> {
  const ctx = await context();
  return ctx ? ctx.service.list(ctx.userId) : [];
}

/** 0 when signed out. */
export async function getUnreadNotificationCount(): Promise<number> {
  const ctx = await context();
  return ctx ? ctx.service.unreadCount(ctx.userId) : 0;
}

/** Empty or missing ids = mark every notification read. */
export async function markNotificationsReadAction(input: { ids?: string[] }): Promise<ActionResult<null>> {
  const parsed = markNotificationsReadSchema.safeParse(input ?? {});
  if (!parsed.success) return fail(firstError(parsed.error));

  const ctx = await context();
  if (!ctx) return fail('Vui lòng đăng nhập');
  try {
    await ctx.service.markRead(ctx.userId, parsed.data.ids);
    return { success: true, data: null };
  } catch (error) {
    console.error(error);
    return fail('Có lỗi xảy ra, vui lòng thử lại');
  }
}
