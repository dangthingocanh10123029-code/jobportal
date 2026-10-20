import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from '@/lib/api';
import { getTalent, inviteTalentAction, searchTalent, setOpenToWorkAction, toggleSavedTalentAction } from './talent';

vi.mock('@/lib/api', () => ({ apiFetch: vi.fn() }));
beforeEach(() => {
  vi.mocked(apiFetch).mockReset();
  vi.mocked(apiFetch).mockResolvedValue({ ok: true, data: null } as never);
});

const ID = '6f1c2b8e-1d2a-4c3b-9e8f-0a1b2c3d4e5f';
const POSTING = '0b5a1c2d-3e4f-4a5b-8c6d-7e8f9a0b1c2d';

// Same cases and messages as tests/test_talent.py (Pydantic).
describe('input sai → không gọi API', () => {
  it.each([
    ['thiếu openToWork', () => setOpenToWorkAction({} as never), 'Dữ liệu không hợp lệ'],
    ['địa điểm quá dài', () => setOpenToWorkAction({ openToWork: true, location: 'x'.repeat(151) }), 'Địa điểm từ 1 đến 150 ký tự'],
    ['kinh nghiệm 51 năm', () => setOpenToWorkAction({ openToWork: true, experienceYears: 51 }), 'Số năm kinh nghiệm từ 0 đến 50'],
    ['kinh nghiệm lẻ', () => setOpenToWorkAction({ openToWork: true, experienceYears: 2.5 }), 'Số năm kinh nghiệm từ 0 đến 50'],
    ['mã ứng viên sai', () => toggleSavedTalentAction({ candidateId: '1' }), 'Mã ứng viên không hợp lệ'],
    ['ghi chú quá dài', () => toggleSavedTalentAction({ candidateId: ID, note: 'x'.repeat(501) }), 'Ghi chú từ 1 đến 500 ký tự'],
    ['mã tin sai', () => inviteTalentAction({ candidateId: ID, postingId: 'x' }), 'Mã tin không hợp lệ'],
    ['lời nhắn quá dài', () => inviteTalentAction({ candidateId: ID, postingId: POSTING, message: 'x'.repeat(1001) }), 'Lời nhắn từ 1 đến 1000 ký tự'],
  ])('%s', async (_, call, error) => {
    expect(await call()).toEqual({ success: false, error });
    expect(apiFetch).not.toHaveBeenCalled();
  });
});

describe('gọi đúng endpoint', () => {
  it('setOpenToWork: địa điểm trống → null, trường bỏ qua giữ nguyên', async () => {
    await setOpenToWorkAction({ openToWork: true, location: '  ' });
    expect(apiFetch).toHaveBeenCalledWith('/me/open-to-work', { method: 'POST', body: { openToWork: true, location: null } });
  });

  it('searchTalent: bộ lọc sai bị bỏ qua', async () => {
    await searchTalent({ q: ' kế toán ', minExperience: 99, page: -3 });
    expect(apiFetch).toHaveBeenCalledWith('/talent?q=k%E1%BA%BF+to%C3%A1n&page=1');
  });

  it('getTalent: mã sai → null', async () => {
    expect(await getTalent('1')).toBeNull();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('invite: POST /talent/<id>/invite với postingId + message', async () => {
    expect(await inviteTalentAction({ candidateId: ID, postingId: POSTING, message: ' Mời bạn ' })).toEqual({ success: true, data: null });
    expect(apiFetch).toHaveBeenCalledWith(`/talent/${ID}/invite`, { method: 'POST', body: { postingId: POSTING, message: 'Mời bạn' } });
  });

  it('invite: lỗi 429 hiện như lỗi nghiệp vụ', async () => {
    vi.mocked(apiFetch).mockResolvedValue({ ok: false, status: 429, error: 'Bạn đã gửi tối đa 20 lời mời trong 24 giờ, vui lòng thử lại sau' } as never);
    expect(await inviteTalentAction({ candidateId: ID, postingId: POSTING })).toEqual({
      success: false,
      error: 'Bạn đã gửi tối đa 20 lời mời trong 24 giờ, vui lòng thử lại sau',
    });
  });
});
