import type { AppNotification, INotificationRepository, RecipientId } from '../domain/types';

export class InMemoryNotificationRepository implements INotificationRepository {
  private readonly rows: (AppNotification & { recipientId: string })[];

  constructor(
    rows: (AppNotification & { recipientId: string })[] = [],
    private readonly now: () => Date = () => new Date(),
  ) {
    this.rows = rows.map((r) => ({ ...r }));
  }

  async listRecent(recipientId: RecipientId, limit: number) {
    return this.rows
      .filter((r) => r.recipientId === recipientId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit)
      .map(({ recipientId: _, ...n }) => n);
  }

  async countUnread(recipientId: RecipientId) {
    return this.rows.filter((r) => r.recipientId === recipientId && r.readAt === null).length;
  }

  async markRead(recipientId: RecipientId, ids: string[] | undefined) {
    const at = this.now().toISOString();
    for (const r of this.rows) {
      if (r.recipientId === recipientId && r.readAt === null && (ids === undefined || ids.includes(r.id))) r.readAt = at;
    }
  }
}
