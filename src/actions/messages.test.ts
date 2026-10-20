import { describe, expect, it } from 'vitest';
import { getConversation, markConversationReadAction, sendMessageAction } from './messages';
import { sendMessageSchema } from './messages-schema';

const id = crypto.randomUUID();

// Invalid input is rejected before any API call, so no env/session is needed here.
describe('sendMessageAction — input sai', () => {
  it.each([
    ['mã hồ sơ sai', { applicationId: 'abc', body: 'Chào' }, 'Mã hồ sơ không hợp lệ'],
    ['tin rỗng', { applicationId: id, body: '' }, 'Tin nhắn từ 1 đến 2000 ký tự'],
    ['chỉ khoảng trắng', { applicationId: id, body: '   \n ' }, 'Tin nhắn từ 1 đến 2000 ký tự'],
    ['quá 2000 ký tự', { applicationId: id, body: 'x'.repeat(2001) }, 'Tin nhắn từ 1 đến 2000 ký tự'],
    ['thiếu body', { applicationId: id }, 'Tin nhắn từ 1 đến 2000 ký tự'],
  ])('%s', async (_, input, error) => {
    expect(await sendMessageAction(input as { applicationId: string; body: string })).toEqual({ success: false, error });
  });

  it('trim tin nhắn, 2000 ký tự sau trim vẫn hợp lệ', () => {
    expect(sendMessageSchema.parse({ applicationId: id, body: `  ${'x'.repeat(2000)}  ` }).body).toHaveLength(2000);
  });
});

describe('các hàm nhắn tin khác — input sai', () => {
  it('markConversationReadAction: mã hồ sơ sai', async () => {
    expect(await markConversationReadAction({ applicationId: 'x' })).toEqual({ success: false, error: 'Mã hồ sơ không hợp lệ' });
  });

  it.each([
    ['mã hồ sơ sai', 'abc', undefined],
    ['before không phải ISO', id, 'hôm qua'],
  ])('getConversation: %s → null', async (_, applicationId, before) => {
    expect(await getConversation(applicationId, before)).toBeNull();
  });
});
