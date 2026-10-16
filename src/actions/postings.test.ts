import { describe, expect, it } from 'vitest';
import { closePostingAction, createPostingDraftAction, getMyPosting, publishPostingAction, updatePostingAction } from './postings';
import { postingInputSchema } from './postings-schema';
import type { PostingInput } from './types';

const valid: PostingInput = {
  title: 'Lập trình viên TypeScript',
  description: 'Phát triển cổng tuyển dụng bằng Next.js và Supabase.',
  location: 'Hà Nội',
  employmentType: 'FULL_TIME',
  salaryMin: null,
  salaryMax: 20_000_000,
  applicationDeadline: '2026-11-01T17:00:00+07:00',
};

// Invalid input is rejected before any Supabase call, so no env/session is needed here.
describe('createPostingDraftAction — input sai', () => {
  it.each([
    ['tiêu đề < 5 ký tự', { title: ' abc ' }, 'Tiêu đề tối thiểu 5 ký tự'],
    ['tiêu đề > 150 ký tự', { title: 'x'.repeat(151) }, 'Tiêu đề tối đa 150 ký tự'],
    ['mô tả < 20 ký tự', { description: 'ngắn quá' }, 'Mô tả tối thiểu 20 ký tự'],
    ['thiếu địa điểm', { location: '  ' }, 'Vui lòng nhập địa điểm'],
    ['loại hình lạ', { employmentType: 'FREELANCE' }, 'Loại hình công việc không hợp lệ'],
    ['lương âm', { salaryMin: -1 }, 'Lương không được âm'],
    ['lương lẻ', { salaryMax: 1.5 }, 'Lương phải là số nguyên'],
    ['deadline không có múi giờ', { applicationDeadline: '2026-11-01T17:00' }, 'Hạn nộp hồ sơ không hợp lệ'],
    ['deadline rác', { applicationDeadline: 'mai' }, 'Hạn nộp hồ sơ không hợp lệ'],
  ])('%s', async (_, override, error) => {
    expect(await createPostingDraftAction({ ...valid, ...override } as never)).toEqual({ success: false, error });
  });
});

describe('id sai', () => {
  it('update/publish/close từ chối id không phải uuid, getMyPosting trả null', async () => {
    const error = { success: false, error: 'Mã tin không hợp lệ' };
    expect(await updatePostingAction({ ...valid, id: '1' })).toEqual(error);
    expect(await publishPostingAction({ id: '1' })).toEqual(error);
    expect(await closePostingAction({ id: '1' })).toEqual(error);
    expect(await getMyPosting('1')).toBeNull();
  });
});

describe('schema — input hợp lệ', () => {
  it('trim chuỗi và chuẩn hoá deadline về ISO UTC', () => {
    expect(postingInputSchema.parse({ ...valid, title: '  Lập trình viên TypeScript ' })).toEqual({
      ...valid,
      applicationDeadline: '2026-11-01T10:00:00.000Z',
    });
  });
});
