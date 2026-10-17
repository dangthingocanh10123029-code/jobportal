import type { AppNotification, NotificationType } from '@/modules/shared/types';

export type { AppNotification, NotificationType };

/** = the recipient's user id. */
export type RecipientId = string & { readonly __brand: 'RecipientId' };

/** Notifications are created by database triggers; the app only reads them and marks them read. */
export interface INotificationRepository {
  /** Newest first. */
  listRecent(recipientId: RecipientId, limit: number): Promise<AppNotification[]>;
  countUnread(recipientId: RecipientId): Promise<number>;
  /** Stamps readAt on the recipient's unread notifications among `ids`, or on all of them when ids is undefined. */
  markRead(recipientId: RecipientId, ids: string[] | undefined): Promise<void>;
}
