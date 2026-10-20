import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from '@/lib/api';
import { getApplicationCv, saveMyCvAction } from './cv';
import { cvSchema } from './cv-schema';

vi.mock('@/lib/api', () => ({ apiFetch: vi.fn() }));
beforeEach(() => vi.mocked(apiFetch).mockReset());

const item = { title: 'Kế toán', organization: 'ACME', startDate: '2020-01', endDate: null, description: '' };
const cv = {
  template: 'MODERN' as const,
  fullName: 'Nguyễn Anna',
  headline: null,
  email: 'anna@example.vn',
  phone: null,
  location: null,
  summary: null,
  experiences: [item],
  educations: [],
  skills: ['Excel'],
  languages: ['Tiếng Anh'],
  certifications: [{ name: 'ACCA', issuer: null, year: 2022 }],
};

// Same cases and messages as tests/test_cv.py (Pydantic).
describe('saveMyCvAction — input sai', () => {
  it.each([
    ['mẫu lạ', { template: 'FANCY' }, 'Mẫu CV không hợp lệ'],
    ['họ tên trống', { fullName: '  ' }, 'Họ tên từ 1 đến 100 ký tự'],
    ['email sai', { email: 'anna' }, 'Email không hợp lệ'],
    ['SĐT sai', { phone: '12ab' }, 'Số điện thoại không hợp lệ'],
    ['giới thiệu quá dài', { summary: 'x'.repeat(2001) }, 'Giới thiệu từ 1 đến 2000 ký tự'],
    ['quá 30 kỹ năng', { skills: Array(31).fill('x') }, 'Tối đa 30 kỹ năng'],
    ['kỹ năng quá dài', { skills: ['x'.repeat(31)] }, 'Kỹ năng từ 1 đến 30 ký tự'],
    ['quá 10 ngoại ngữ', { languages: Array(11).fill('Anh') }, 'Tối đa 10 ngoại ngữ'],
    ['quá 15 kinh nghiệm', { experiences: Array(16).fill(item) }, 'Tối đa 15 kinh nghiệm'],
    ['tháng sai', { educations: [{ ...item, startDate: '2015-13' }] }, 'Tháng bắt đầu không hợp lệ'],
    ['tên công ty quá dài', { experiences: [{ ...item, organization: 'x'.repeat(151) }] }, 'Tên công ty / trường từ 1 đến 150 ký tự'],
    ['mô tả quá dài', { experiences: [{ ...item, description: 'x'.repeat(2001) }] }, 'Mô tả tối đa 2000 ký tự'],
    ['năm cấp sai', { certifications: [{ name: 'ACCA', issuer: null, year: 1800 }] }, 'Năm cấp không hợp lệ'],
  ])('%s', async (_, patch, error) => {
    expect(await saveMyCvAction({ ...cv, ...patch } as never)).toEqual({ success: false, error });
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('trim, ô trống → null, rồi PUT /me/cv', async () => {
    vi.mocked(apiFetch).mockResolvedValue({ ok: true, data: { candidateId: 'x' } } as never);
    await saveMyCvAction({ ...cv, fullName: '  Nguyễn Anna ', phone: ' ', headline: '' });
    expect(apiFetch).toHaveBeenCalledWith('/me/cv', {
      method: 'PUT',
      body: { ...cv, fullName: 'Nguyễn Anna', phone: null, headline: null },
    });
  });

  it('endDate/issuer/year bỏ trống → null, description mặc định rỗng', () => {
    const parsed = cvSchema.parse({ ...cv, experiences: [{ ...item, endDate: undefined, description: undefined }], certifications: [{ name: 'ACCA' }] });
    expect(parsed.experiences[0]).toEqual(item);
    expect(parsed.certifications[0]).toEqual({ name: 'ACCA', issuer: null, year: null });
  });
});

describe('getApplicationCv', () => {
  it('mã hồ sơ sai → null', async () => {
    expect(await getApplicationCv('1')).toBeNull();
    expect(apiFetch).not.toHaveBeenCalled();
  });
});
