import type { Message } from '@/actions/types';

/** Older pages loaded on demand + the latest page from the server; the latest page wins on overlap. */
export function mergeMessages(older: Message[], latest: Message[]): Message[] {
  const latestIds = new Set(latest.map((message) => message.id));
  return [...older.filter((message) => !latestIds.has(message.id)), ...latest];
}

export function formatMessageTime(value: string) {
  return new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}
