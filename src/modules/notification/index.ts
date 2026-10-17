import type { AppNotification, INotificationRepository, RecipientId } from './domain/types';

export type * from './domain/types';

export const NOTIFICATION_LIST_LIMIT = 30;

/** The signed-in user's in-app notifications. */
export class NotificationService {
  constructor(private readonly repo: INotificationRepository) {}

  list(recipientId: RecipientId): Promise<AppNotification[]> {
    return this.repo.listRecent(recipientId, NOTIFICATION_LIST_LIMIT);
  }

  unreadCount(recipientId: RecipientId): Promise<number> {
    return this.repo.countUnread(recipientId);
  }

  /** Empty or missing ids = all. */
  markRead(recipientId: RecipientId, ids?: string[]): Promise<void> {
    return this.repo.markRead(recipientId, ids?.length ? ids : undefined);
  }
}
