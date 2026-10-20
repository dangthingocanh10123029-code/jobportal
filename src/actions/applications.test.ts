import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from '@/lib/api';
import {
  changeApplicationStatusAction,
  getMyApplication,
  getMyApplicationForPosting,
  getResumeUrlAction,
  listApplicationsForPosting,
  submitApplicationAction,
  withdrawApplicationAction,
} from './applications';
import { MAX_RESUME_BYTES } from './applications-schema';

vi.mock('@/lib/api', () => ({ apiFetch: vi.fn() }));
beforeEach(() => vi.mocked(apiFetch).mockReset());

const POSTING_ID = '6f1d2c3b-4a5e-4f60-8a7b-9c0d1e2f3a4b';
const pdf = (bytes: BlobPart = '%PDF-1.7 ...', type = 'application/pdf') => new File([bytes], 'cv.pdf', { type });

function form(fields: Record<string, string | File>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return data;
}

// Invalid input is rejected before any API call.
describe('submitApplicationAction — input sai', () => {
  it.each([
    ['thiếu mã tin', form({ resume: pdf() }), 'Mã tin không hợp lệ'],
    ['mã tin không phải uuid', form({ postingId: '1', resume: pdf() }), 'Mã tin không hợp lệ'],
    ['thiếu file', form({ postingId: POSTING_ID }), 'Vui lòng chọn file CV'],
    ['file rỗng', form({ postingId: POSTING_ID, resume: pdf('') }), 'Vui lòng chọn file CV'],
    ['không phải PDF', form({ postingId: POSTING_ID, resume: pdf('%PDF-', 'image/png') }), 'CV phải là file PDF'],
    ['đuôi PDF nhưng nội dung không phải', form({ postingId: POSTING_ID, resume: pdf('MZ...') }), 'CV phải là file PDF'],
    [
      'lớn hơn 5 MB',
      form({ postingId: POSTING_ID, resume: pdf(new Uint8Array(MAX_RESUME_BYTES + 1).fill(37)) }),
      'CV tối đa 5 MB',
    ],
  ])('%s', async (_, data, error) => {
    expect(await submitApplicationAction(data)).toEqual({ success: false, error });
  });

  it.each([
    ['nguồn CV lạ', form({ postingId: POSTING_ID, cvSource: 'LINK' }), 'Nguồn CV không hợp lệ'],
    ['ONLINE nhưng mã tin sai', form({ postingId: '1', cvSource: 'ONLINE' }), 'Mã tin không hợp lệ'],
    ['FILE tường minh vẫn cần file', form({ postingId: POSTING_ID, cvSource: 'FILE' }), 'Vui lòng chọn file CV'],
  ])('cvSource: %s', async (_, data, error) => {
    expect(await submitApplicationAction(data)).toEqual({ success: false, error });
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('cvSource ONLINE: không cần file, gửi form lên API', async () => {
    vi.mocked(apiFetch).mockResolvedValue({ ok: true, data: { cvSource: 'ONLINE' } } as never);
    const data = form({ postingId: POSTING_ID, cvSource: 'ONLINE' });
    expect(await submitApplicationAction(data)).toEqual({ success: true, data: { cvSource: 'ONLINE' } });
    expect(apiFetch).toHaveBeenCalledWith('/applications', { method: 'POST', formData: data });
  });

  it('không phải FormData', async () => {
    expect(await submitApplicationAction({ postingId: POSTING_ID } as never)).toEqual({
      success: false,
      error: 'Dữ liệu không hợp lệ',
    });
  });
});

describe('getMyApplicationForPosting', () => {
  it('mã tin sai → null', async () => {
    expect(await getMyApplicationForPosting('1')).toBeNull();
  });
});

describe('ticket 06 — input sai', () => {
  it('getMyApplication: mã hồ sơ sai → null', async () => {
    expect(await getMyApplication('1')).toBeNull();
  });

  it.each([
    ['mã hồ sơ không phải uuid', { applicationId: '1' }],
    ['thiếu mã hồ sơ', {}],
  ])('withdrawApplicationAction: %s', async (_, input) => {
    expect(await withdrawApplicationAction(input as never)).toEqual({ success: false, error: 'Mã hồ sơ không hợp lệ' });
  });
});

describe('ticket 07 — input sai', () => {
  const APPLICATION_ID = '7a2b3c4d-5e6f-4a1b-8c2d-3e4f5a6b7c8d';

  it('listApplicationsForPosting: mã tin sai → null', async () => {
    expect(await listApplicationsForPosting('1')).toBeNull();
  });

  it.each([
    ['mã hồ sơ không phải uuid', { applicationId: '1', toStatus: 'REVIEWING' }, 'Mã hồ sơ không hợp lệ'],
    ['trạng thái lạ', { applicationId: APPLICATION_ID, toStatus: 'DONE' }, 'Trạng thái không hợp lệ'],
    ['thiếu trạng thái', { applicationId: APPLICATION_ID }, 'Trạng thái không hợp lệ'],
  ])('changeApplicationStatusAction: %s', async (_, input, error) => {
    expect(await changeApplicationStatusAction(input as never)).toEqual({ success: false, error });
  });

  it('getResumeUrlAction: mã hồ sơ sai', async () => {
    expect(await getResumeUrlAction({ applicationId: '1' })).toEqual({ success: false, error: 'Mã hồ sơ không hợp lệ' });
  });
});


describe('gọi FastAPI', () => {
  const APPLICATION_ID = '7a2b3c4d-5e6f-4a1b-8c2d-3e4f5a6b7c8d';

  it('submitApplicationAction chuyển tiếp nguyên FormData; lỗi API → ActionResult thất bại', async () => {
    const data = form({ postingId: POSTING_ID, resume: pdf() });
    vi.mocked(apiFetch).mockResolvedValueOnce({ ok: false, status: 409, error: 'Bạn đã nộp hồ sơ cho tin này rồi' });
    expect(await submitApplicationAction(data)).toEqual({ success: false, error: 'Bạn đã nộp hồ sơ cho tin này rồi' });
    expect(apiFetch).toHaveBeenCalledWith('/applications', { method: 'POST', formData: data });
  });

  it('changeApplicationStatusAction gửi { toStatus }', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({ ok: true, data: { id: APPLICATION_ID } });
    expect(await changeApplicationStatusAction({ applicationId: APPLICATION_ID, toStatus: 'REVIEWING' })).toEqual({
      success: true,
      data: { id: APPLICATION_ID },
    });
    expect(apiFetch).toHaveBeenCalledWith(`/applications/${APPLICATION_ID}/status`, {
      method: 'POST',
      body: { toStatus: 'REVIEWING' },
    });
  });

  it('listApplicationsForPosting: 404 → null', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({ ok: false, status: 404, error: 'x' });
    expect(await listApplicationsForPosting(POSTING_ID)).toBeNull();
  });
});
