import { describe, expect, it } from 'vitest';
import { markNotificationsReadAction } from './notifications';

// Invalid input is rejected before any Supabase call, so no env/session is needed here.
describe('markNotificationsReadAction — input sai', () => {
  it.each([
    ['id không phải uuid', { ids: ['abc'] }, 'Mã thông báo không hợp lệ'],
    ['> 100 id', { ids: Array.from({ length: 101 }, () => crypto.randomUUID()) }, 'Tối đa 100 thông báo mỗi lần'],
  ])('%s', async (_, input, error) => {
    expect(await markNotificationsReadAction(input)).toEqual({ success: false, error });
  });
});
