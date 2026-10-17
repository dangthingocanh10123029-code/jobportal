import { describe, expect, it } from 'vitest';
import {
  closePostingAction,
  createPostingDraftAction,
  getMyPosting,
  getPostingDetail,
  getRelatedPostings,
  publishPostingAction,
  updatePostingAction,
} from './postings';
import { pageSchema, postingInputSchema, searchFilterSchema } from './postings-schema';
import type { PostingInput } from './types';

const valid: PostingInput = {
  title: 'Lập trình viên TypeScript',
  description: 'Phát triển cổng tuyển dụng bằng Next.js và Supabase.',
  location: 'Hà Nội',
  employmentType: 'FULL_TIME',
  salaryMin: null,
  salaryMax: 20_000_000,
  applicationDeadline: '2026-11-01T17:00:00+07:00',
  industry: 'IT_SOFTWARE',
  level: 'JUNIOR',
  experienceYears: 0,
  headcount: 1,
  skills: ['TypeScript'],
  requirements: 'Biết TypeScript cơ bản.',
  benefits: 'Lương tháng 13, bảo hiểm.',
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
    ['ngành lạ', { industry: 'CRYPTO' }, 'Ngành nghề không hợp lệ'],
    ['cấp bậc lạ', { level: 'CEO' }, 'Cấp bậc không hợp lệ'],
    ['kinh nghiệm > 20', { experienceYears: 21 }, 'Số năm kinh nghiệm tối đa 20'],
    ['kinh nghiệm âm', { experienceYears: -1 }, 'Số năm kinh nghiệm không được âm'],
    ['số lượng 0', { headcount: 0 }, 'Số lượng tuyển tối thiểu 1'],
    ['số lượng > 999', { headcount: 1000 }, 'Số lượng tuyển tối đa 999'],
    ['11 kỹ năng', { skills: Array.from({ length: 11 }, (_, i) => `Kỹ năng ${i}`) }, 'Tối đa 10 kỹ năng'],
    ['kỹ năng rỗng', { skills: ['  '] }, 'Kỹ năng không được để trống'],
    ['kỹ năng > 30 ký tự', { skills: ['x'.repeat(31)] }, 'Mỗi kỹ năng tối đa 30 ký tự'],
    ['kỹ năng trùng khác hoa thường', { skills: ['Excel', ' excel '] }, 'Kỹ năng bị trùng'],
    ['yêu cầu < 10 ký tự', { requirements: 'ngắn' }, 'Yêu cầu tối thiểu 10 ký tự'],
    ['quyền lợi > 5000 ký tự', { benefits: 'x'.repeat(5001) }, 'Quyền lợi tối đa 5000 ký tự'],
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
    expect(await getPostingDetail('1')).toBeNull();
    expect(await getRelatedPostings('1')).toEqual([]);
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

describe('pageSchema', () => {
  it.each([[undefined, 1], ['3', 3], [2, 2], [0, 1], [-1, 1], [1.5, 1], ['abc', 1], ['1000', 1000], ['1001', 1000], ['1e9', 1000]])('%s → %s', (input, page) => {
    expect(pageSchema.parse(input)).toBe(page);
  });
});

describe('searchFilterSchema', () => {
  it('giữ giá trị hợp lệ, cắt khoảng trắng, ép số từ chuỗi', () => {
    expect(
      searchFilterSchema.parse({ q: '  ke toan ', location: 'Hà Nội', employmentType: 'PART_TIME', minSalary: '10000000', page: '2' }),
    ).toEqual({ q: 'ke toan', location: 'Hà Nội', employmentType: 'PART_TIME', minSalary: 10_000_000, page: 2 });
  });

  it('bộ lọc v2 từ query string', () => {
    expect(
      searchFilterSchema.parse({ industry: 'SALES', level: 'SENIOR', maxExperience: '0', skill: ' Excel ', sort: 'salary_desc' }),
    ).toEqual({ industry: 'SALES', level: 'SENIOR', maxExperience: 0, skill: 'Excel', sort: 'salary_desc', page: 1 });
    expect(
      searchFilterSchema.parse({ industry: 'X', level: 'CEO', maxExperience: '-1', skill: '', sort: 'random' }),
    ).toEqual({ page: 1 });
    expect(searchFilterSchema.parse({ maxExperience: '21' })).toEqual({ page: 1 });
  });

  it('giá trị rỗng hoặc rác → bỏ qua bộ lọc đó, không lỗi', () => {
    expect(
      searchFilterSchema.parse({ q: '', location: '   ', employmentType: 'ABC', minSalary: '-5', page: 'x' }),
    ).toEqual({ page: 1 });
    expect(searchFilterSchema.parse(undefined)).toEqual({ page: 1 });
    expect(searchFilterSchema.parse({ minSalary: 'abc', q: ['a', 'b'] })).toEqual({ page: 1 });
    expect(searchFilterSchema.parse({ minSalary: '1e30' })).toEqual({ page: 1 }); // would overflow bigint
    expect(searchFilterSchema.parse({ page: '99999' })).toEqual({ page: 1000 });
  });

  it('từ khóa quá 100 ký tự bị cắt', () => {
    expect(searchFilterSchema.parse({ q: 'a'.repeat(150) }).q).toHaveLength(100);
  });
});
