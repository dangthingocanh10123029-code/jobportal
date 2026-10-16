import { describe, expect, it } from 'vitest';
import { getMyApplicationForPosting, submitApplicationAction } from './applications';
import { MAX_RESUME_BYTES } from './applications-schema';

const POSTING_ID = '6f1d2c3b-4a5e-4f60-8a7b-9c0d1e2f3a4b';
const pdf = (bytes: BlobPart = '%PDF-1.7 ...', type = 'application/pdf') => new File([bytes], 'cv.pdf', { type });

function form(fields: Record<string, string | File>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return data;
}

// Invalid input is rejected before any Supabase call, so no env/session is needed here.
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
