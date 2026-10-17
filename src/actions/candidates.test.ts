import { describe, expect, it, vi } from 'vitest';
import { apiFetch } from '@/lib/api';
import { getApplicantProfile, listSavedPostings, toggleSavedPostingAction, updateCandidateProfileAction } from './candidates';
import { candidateProfileInputSchema } from './candidates-schema';

vi.mock('@/lib/api', () => ({ apiFetch: vi.fn() }));

// Invalid input is rejected before any API call, so no env/session is needed here.
describe('updateCandidateProfileAction — input sai', () => {
  it.each([
    ['tiêu đề > 150 ký tự', { headline: 'x'.repeat(151) }, 'Tiêu đề hồ sơ tối đa 150 ký tự'],
    ['kinh nghiệm > 5000 ký tự', { experience: 'x'.repeat(5001) }, 'Kinh nghiệm tối đa 5000 ký tự'],
    ['học vấn > 5000 ký tự', { education: 'x'.repeat(5001) }, 'Học vấn tối đa 5000 ký tự'],
    ['> 20 kỹ năng', { skills: Array.from({ length: 21 }, (_, i) => `k${i}`) }, 'Tối đa 20 kỹ năng'],
    ['kỹ năng rỗng', { skills: ['  '] }, 'Kỹ năng không được để trống'],
    ['kỹ năng > 30 ký tự', { skills: ['x'.repeat(31)] }, 'Mỗi kỹ năng tối đa 30 ký tự'],
    ['kỹ năng trùng', { skills: ['React', 'react'] }, 'Kỹ năng bị trùng'],
  ])('%s', async (_, input, error) => {
    expect(await updateCandidateProfileAction(input)).toEqual({ success: false, error });
  });
});

describe('candidateProfileInputSchema', () => {
  it('chuỗi rỗng (= xóa) giữ nguyên, trường bỏ trống giữ nguyên, cắt khoảng trắng', () => {
    expect(candidateProfileInputSchema.parse({ headline: ' Dev ', experience: '  ', skills: [' React '] })).toEqual({
      headline: 'Dev',
      experience: '',
      skills: ['React'],
    });
  });
});

describe('toggleSavedPostingAction / getApplicantProfile — mã sai', () => {
  it('postingId không phải uuid → lỗi; applicationId sai → null', async () => {
    expect(await toggleSavedPostingAction({ postingId: 'abc' })).toEqual({ success: false, error: 'Mã tin không hợp lệ' });
    expect(await getApplicantProfile('abc')).toBeNull();
  });
});

describe('listSavedPostings — đọc không nuốt lỗi máy chủ', () => {
  it('401/403 → [], 5xx → ném (Next hiện trang lỗi thay vì "0 tin")', async () => {
    vi.mocked(apiFetch).mockResolvedValue({ ok: false, status: 403, error: 'Không có quyền' });
    expect(await listSavedPostings()).toEqual([]);
    vi.mocked(apiFetch).mockResolvedValue({ ok: false, status: 500, error: 'Lỗi máy chủ (500)' });
    await expect(listSavedPostings()).rejects.toThrow('Lỗi máy chủ (500)');
  });
});
