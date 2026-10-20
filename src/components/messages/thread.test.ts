import { describe, expect, it } from 'vitest';
import type { Message } from '@/actions/types';
import { formatMessageTime, mergeMessages } from './thread';

const message = (id: string, body = id): Message => ({ id, applicationId: 'a', senderId: 's', mine: false, body, createdAt: '2026-10-20T02:30:00Z', readAt: null });

describe('mergeMessages', () => {
  it('puts older pages first and drops ids the latest page already has', () => {
    const merged = mergeMessages([message('1'), message('2', 'stale')], [message('2', 'fresh'), message('3')]);
    expect(merged.map((m) => m.id)).toEqual(['1', '2', '3']);
    expect(merged[1].body).toBe('fresh');
  });
});

describe('formatMessageTime', () => {
  it('shows Vietnam time', () => {
    expect(formatMessageTime('2026-10-20T02:30:00Z')).toContain('09:30');
  });
});
