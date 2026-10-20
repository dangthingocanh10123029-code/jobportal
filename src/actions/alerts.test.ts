import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from '@/lib/api';
import { createJobAlertAction, deleteJobAlertAction, getRecommendedPostings, updateJobAlertAction } from './alerts';

vi.mock('@/lib/api', () => ({ apiFetch: vi.fn() }));
beforeEach(() => {
  vi.mocked(apiFetch).mockReset();
  vi.mocked(apiFetch).mockResolvedValue({ ok: true, data: null } as never);
});

const ID = '6f1c2b8e-1d2a-4c3b-9e8f-0a1b2c3d4e5f';

// Same cases and messages as tests/test_alerts.py (Pydantic).
describe('input sai → không gọi API', () => {
  it.each([
    ['tên trống', () => createJobAlertAction({ name: '  ', filter: { q: 'x' } }), 'Tên thông báo từ 1 đến 100 ký tự'],
    ['tên quá dài', () => createJobAlertAction({ name: 'x'.repeat(101), filter: { q: 'x' } }), 'Tên thông báo từ 1 đến 100 ký tự'],
    ['bộ lọc rỗng', () => createJobAlertAction({ name: 'A', filter: {} }), 'Bộ lọc cần ít nhất 1 điều kiện'],
    ['bộ lọc chỉ có khoảng trắng', () => createJobAlertAction({ name: 'A', filter: { q: ' ', location: '' } }), 'Bộ lọc cần ít nhất 1 điều kiện'],
    ['từ khóa quá dài', () => createJobAlertAction({ name: 'A', filter: { q: 'x'.repeat(101) } }), 'Từ khóa từ 1 đến 100 ký tự'],
    ['loại hình lạ', () => createJobAlertAction({ name: 'A', filter: { employmentType: 'REMOTE' as never } }), 'Dữ liệu không hợp lệ'],
    ['lương 0', () => createJobAlertAction({ name: 'A', filter: { minSalary: 0 } }), 'Lương tối thiểu phải lớn hơn 0'],
    ['lương lẻ', () => createJobAlertAction({ name: 'A', filter: { minSalary: 1.5 } }), 'Lương tối thiểu phải là số nguyên'],
    ['trường lạ', () => createJobAlertAction({ name: 'A', filter: { skill: 'excel' } as never }), 'Dữ liệu không hợp lệ'],
    ['mã sai khi bật/tắt', () => updateJobAlertAction({ id: '1', active: true }), 'Mã thông báo không hợp lệ'],
    ['active không phải boolean', () => updateJobAlertAction({ id: ID, active: 'yes' as never }), 'Dữ liệu không hợp lệ'],
    ['mã sai khi xóa', () => deleteJobAlertAction({ id: 'x' }), 'Mã thông báo không hợp lệ'],
  ])('%s', async (_, call, error) => {
    expect(await call()).toEqual({ success: false, error });
    expect(apiFetch).not.toHaveBeenCalled();
  });
});

describe('gọi đúng endpoint', () => {
  it('create: cắt khoảng trắng, bỏ trường trống', async () => {
    await createJobAlertAction({ name: ' Kế toán HN ', filter: { q: ' kế toán ', location: ' ', industry: 'ACCOUNTING_FINANCE', minSalary: 10_000_000 } });
    expect(apiFetch).toHaveBeenCalledWith('/me/job-alerts', {
      method: 'POST',
      body: { name: 'Kế toán HN', filter: { q: 'kế toán', industry: 'ACCOUNTING_FINANCE', minSalary: 10_000_000 } },
    });
  });

  it('update / delete', async () => {
    await updateJobAlertAction({ id: ID, active: false });
    expect(apiFetch).toHaveBeenCalledWith(`/me/job-alerts/${ID}`, { method: 'PATCH', body: { active: false } });
    expect(await deleteJobAlertAction({ id: ID })).toEqual({ success: true, data: null });
    expect(apiFetch).toHaveBeenLastCalledWith(`/me/job-alerts/${ID}`, { method: 'DELETE' });
  });

  it('recommendations: 4xx → [], 5xx ném lỗi', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({ ok: false, status: 401, error: 'x' } as never);
    expect(await getRecommendedPostings()).toEqual([]);
    vi.mocked(apiFetch).mockResolvedValueOnce({ ok: false, status: 500, error: 'boom' } as never);
    await expect(getRecommendedPostings()).rejects.toThrow('boom');
  });

  it('lỗi nghiệp vụ từ API', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({ ok: false, status: 409, error: 'Bạn chỉ tạo được tối đa 5 thông báo việc làm' } as never);
    expect(await createJobAlertAction({ name: 'A', filter: { q: 'x' } })).toEqual({
      success: false, error: 'Bạn chỉ tạo được tối đa 5 thông báo việc làm',
    });
  });
});
