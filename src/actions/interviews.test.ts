import { describe, expect, it } from 'vitest';
import {
  cancelInterviewAction,
  listInterviewsForApplication,
  markInterviewDoneAction,
  respondInterviewAction,
  scheduleInterviewAction,
} from './interviews';
import { scheduleInterviewSchema } from './interviews-schema';

const id = crypto.randomUUID();
const inHours = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();
const valid = {
  applicationId: id,
  scheduledAt: inHours(24),
  durationMinutes: 60,
  mode: 'ONLINE' as const,
  location: 'https://meet.example/abc',
};

// Invalid input is rejected before any API call, so no env/session is needed here.
describe('scheduleInterviewAction — input sai', () => {
  it.each([
    ['mã hồ sơ sai', { applicationId: 'abc' }, 'Mã hồ sơ không hợp lệ'],
    ['giờ không có múi giờ', { scheduledAt: '2030-01-01T09:00' }, 'Giờ phỏng vấn không hợp lệ'],
    ['giờ đã qua', { scheduledAt: inHours(-1) }, 'Giờ phỏng vấn phải ở tương lai và trong vòng 90 ngày'],
    ['quá 90 ngày', { scheduledAt: inHours(91 * 24) }, 'Giờ phỏng vấn phải ở tương lai và trong vòng 90 ngày'],
    ['thời lượng < 15', { durationMinutes: 10 }, 'Thời lượng phải từ 15 đến 240 phút'],
    ['thời lượng lẻ', { durationMinutes: 30.5 }, 'Thời lượng phải từ 15 đến 240 phút'],
    ['hình thức lạ', { mode: 'PHONE' }, 'Hình thức phỏng vấn không hợp lệ'],
    ['link không phải http(s)', { location: 'meet.example/abc' }, 'Link phỏng vấn phải là URL http(s)'],
    ['địa chỉ quá ngắn', { mode: 'ONSITE', location: '  Q1 ' }, 'Địa chỉ phỏng vấn từ 5 đến 300 ký tự'],
    ['ghi chú > 1000', { note: 'x'.repeat(1001) }, 'Ghi chú tối đa 1000 ký tự'],
  ])('%s', async (_, patch, error) => {
    expect(await scheduleInterviewAction({ ...valid, ...patch } as typeof valid)).toEqual({ success: false, error });
  });

  it('trim địa chỉ và ghi chú, bỏ ghi chú rỗng', () => {
    const parsed = scheduleInterviewSchema.parse({ ...valid, mode: 'ONSITE', location: ' 12 Lê Lợi, Q1 ', note: '  ' });
    expect(parsed).toMatchObject({ location: '12 Lê Lợi, Q1', note: undefined });
  });
});

describe('các action phỏng vấn khác — input sai', () => {
  it.each([
    ['respond: mã lịch sai', () => respondInterviewAction({ interviewId: 'x', response: 'CONFIRM' }), 'Mã lịch phỏng vấn không hợp lệ'],
    ['respond: phản hồi lạ', () => respondInterviewAction({ interviewId: id, response: 'MAYBE' as 'CONFIRM' }), 'Phản hồi không hợp lệ'],
    ['respond: xin đổi giờ thiếu ghi chú', () => respondInterviewAction({ interviewId: id, response: 'RESCHEDULE', note: ' ' }), 'Vui lòng ghi chú giờ bạn muốn đổi'],
    ['respond: ghi chú > 500', () => respondInterviewAction({ interviewId: id, response: 'DECLINE', note: 'x'.repeat(501) }), 'Ghi chú tối đa 500 ký tự'],
    ['cancel: lý do > 500', () => cancelInterviewAction({ interviewId: id, reason: 'x'.repeat(501) }), 'Lý do hủy tối đa 500 ký tự'],
    ['done: mã lịch sai', () => markInterviewDoneAction({ interviewId: '' }), 'Mã lịch phỏng vấn không hợp lệ'],
  ])('%s', async (_, call, error) => {
    expect(await call()).toEqual({ success: false, error });
  });

  it('listInterviewsForApplication: mã hồ sơ sai → null', async () => {
    expect(await listInterviewsForApplication('abc')).toBeNull();
  });
});
