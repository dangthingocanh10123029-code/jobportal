'use server';

import { apiFetch } from '@/lib/api';
import { fail, readOr, toAction } from './_shared';
import { applicationIdSchema } from './applications-schema';
import { firstError } from './auth-schema';
import { beforeSchema, markConversationReadSchema, sendMessageSchema } from './messages-schema';
import type { ActionResult, Conversation, Message } from './types';

/** Applications with ≥ 1 message or not yet WITHDRAWN/REJECTED/HIRED; latest activity first. [] when signed out. */
export async function listConversations(): Promise<Conversation[]> {
  return readOr(await apiFetch<Conversation[]>('/me/conversations'), []);
}

/** 50 messages per page, oldest first; `before` = createdAt of the oldest message shown. null unless a side of the Application. */
export async function getConversation(
  applicationId: string,
  before?: string,
): Promise<{ conversation: Conversation; messages: Message[]; hasMore: boolean } | null> {
  const id = applicationIdSchema.safeParse(applicationId);
  const cursor = beforeSchema.safeParse(before);
  if (!id.success || !cursor.success) return null;
  const query = cursor.data ? `?before=${encodeURIComponent(cursor.data)}` : '';
  return readOr(await apiFetch(`/applications/${id.data}/messages${query}`), null);
}

/** Either side; not once the Application is WITHDRAWN/REJECTED/HIRED; at most 30 messages per minute. */
export async function sendMessageAction(input: { applicationId: string; body: string }): Promise<ActionResult<Message>> {
  const parsed = sendMessageSchema.safeParse(input ?? {});
  if (!parsed.success) return fail(firstError(parsed.error));
  const { applicationId, body } = parsed.data;
  return toAction(await apiFetch(`/applications/${applicationId}/messages`, { method: 'POST', body: { body } }));
}

/** Marks the other side's messages in this conversation read. */
export async function markConversationReadAction(input: { applicationId: string }): Promise<ActionResult<null>> {
  const parsed = markConversationReadSchema.safeParse(input ?? {});
  if (!parsed.success) return fail(firstError(parsed.error));
  const res = await apiFetch(`/applications/${parsed.data.applicationId}/messages/read`, { method: 'POST' });
  return res.ok ? { success: true, data: null } : fail(res.error);
}

/** 0 when signed out. */
export async function getUnreadMessageCount(): Promise<number> {
  return readOr(await apiFetch<number>('/me/messages/unread-count'), 0);
}
