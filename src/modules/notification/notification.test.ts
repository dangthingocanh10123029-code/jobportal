import { describe, expect, it } from 'vitest';
import { InMemoryNotificationRepository } from './adapters/in-memory';
import { NotificationService, type AppNotification, type RecipientId } from './index';

const me = 'user-1' as RecipientId;
const notification = (id: string, recipientId: string, createdAt: string, readAt: string | null = null) => ({
  id, recipientId, createdAt, readAt,
  type: 'APPLICATION_RECEIVED' as const, title: 'Có đơn ứng tuyển mới', body: '', link: '/employer/postings/p/applications',
});
const at = (minute: number) => new Date(Date.UTC(2026, 9, 17, 0, minute)).toISOString();
const ids = (list: AppNotification[]) => list.map((n) => n.id);

describe('NotificationService', () => {
  it('list: chỉ của mình, mới nhất trước, tối đa 30', async () => {
    const rows = [
      ...Array.from({ length: 31 }, (_, i) => notification(`n${i}`, me, at(i))),
      notification('other', 'user-2', at(59)),
    ];
    const list = await new NotificationService(new InMemoryNotificationRepository(rows)).list(me);
    expect(list).toHaveLength(30);
    expect(ids(list).slice(0, 2)).toEqual(['n30', 'n29']);
    expect(ids(list)).not.toContain('other');
  });

  it('markRead: ids rỗng/thiếu = tất cả của mình; có ids = chỉ những thông báo đó; đã đọc giữ nguyên readAt', async () => {
    const now = () => new Date(at(30));
    const rows = () => [
      notification('a', me, at(1)),
      notification('b', me, at(2), at(5)),
      notification('c', me, at(3)),
      notification('x', 'user-2', at(4)),
    ];

    const some = new NotificationService(new InMemoryNotificationRepository(rows(), now));
    await some.markRead(me, ['a', 'x']);
    expect(await some.unreadCount(me)).toBe(1);
    expect(await some.unreadCount('user-2' as RecipientId)).toBe(1);

    for (const all of [undefined, []]) {
      const service = new NotificationService(new InMemoryNotificationRepository(rows(), now));
      await service.markRead(me, all);
      expect(await service.unreadCount(me)).toBe(0);
      expect((await service.list(me)).find((n) => n.id === 'b')?.readAt).toBe(at(5));
      expect(await service.unreadCount('user-2' as RecipientId)).toBe(1);
    }
  });
});
