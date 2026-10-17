import { beforeEach, describe, expect, it } from 'vitest';
import { fromPartial } from '@total-typescript/shoehorn';
import { InMemoryJobPostingRepository } from './adapters/in-memory';
import { JobPostingService, type EmployerId, type JobPostingId, type PostingInput } from './index';

const A = 'employer-a' as EmployerId;
const B = 'employer-b' as EmployerId;
const NOW = new Date('2026-10-16T00:00:00Z');

const input = (overrides: Partial<PostingInput> = {}): PostingInput =>
  fromPartial<PostingInput>({
    title: 'Lập trình viên TypeScript',
    description: 'Phát triển cổng tuyển dụng bằng Next.js và Supabase.',
    location: 'Hà Nội',
    employmentType: 'FULL_TIME',
    salaryMin: 15_000_000,
    salaryMax: 25_000_000,
    applicationDeadline: '2026-11-01T00:00:00.000Z',
    industry: 'IT_SOFTWARE',
    level: 'JUNIOR',
    experienceYears: 1,
    headcount: 2,
    skills: ['TypeScript', 'React'],
    requirements: 'Biết TypeScript cơ bản.',
    benefits: 'Lương tháng 13, bảo hiểm đầy đủ.',
    ...overrides,
  });

let now: Date;
let service: JobPostingService;

beforeEach(() => {
  now = NOW;
  service = new JobPostingService(new InMemoryJobPostingRepository({ [A]: 'ACME', [B]: 'Globex' }, () => now), () => now);
});

describe('createDraft', () => {
  it('tạo tin DRAFT của Employer, kèm tên công ty', async () => {
    const posting = await service.createDraft(A, input());
    expect(posting).toMatchObject({
      ...input(),
      employerId: A,
      companyName: 'ACME',
      companyLogoUrl: null,
      status: 'DRAFT',
      displayStatus: 'DRAFT',
    });
  });

  it('cho phép lương thỏa thuận (null) và chỉ một đầu lương', async () => {
    await expect(service.createDraft(A, input({ salaryMin: null, salaryMax: null }))).resolves.toBeDefined();
    await expect(service.createDraft(A, input({ salaryMin: 10_000_000, salaryMax: null }))).resolves.toBeDefined();
  });

  it('từ chối salaryMin > salaryMax', async () => {
    await expect(service.createDraft(A, input({ salaryMin: 30_000_000, salaryMax: 20_000_000 }))).rejects.toMatchObject({
      code: 'INVALID_SALARY',
    });
  });

  it('cho phép lưu nháp với deadline quá khứ (chỉ chặn khi đăng)', async () => {
    await expect(service.createDraft(A, input({ applicationDeadline: '2026-01-01T00:00:00Z' }))).resolves.toBeDefined();
  });
});

describe('publish', () => {
  it('DRAFT → PUBLISHED ngay, không cần duyệt', async () => {
    const draft = await service.createDraft(A, input());
    expect(await service.publish(A, draft.id)).toMatchObject({ status: 'PUBLISHED', displayStatus: 'PUBLISHED' });
  });

  it('từ chối deadline quá khứ hoặc đúng bằng hiện tại', async () => {
    const past = await service.createDraft(A, input({ applicationDeadline: '2026-10-15T23:59:59Z' }));
    await expect(service.publish(A, past.id)).rejects.toMatchObject({ code: 'DEADLINE_NOT_IN_FUTURE' });
    const exact = await service.createDraft(A, input({ applicationDeadline: NOW.toISOString() }));
    await expect(service.publish(A, exact.id)).rejects.toMatchObject({ code: 'DEADLINE_NOT_IN_FUTURE' });
    expect((await service.getMine(A, past.id))?.status).toBe('DRAFT');
  });

  it.each(['PUBLISHED', 'CLOSED'] as const)('không đăng lại tin %s', async (from) => {
    const draft = await service.createDraft(A, input());
    await service.publish(A, draft.id);
    if (from === 'CLOSED') await service.close(A, draft.id);
    await expect(service.publish(A, draft.id)).rejects.toMatchObject({ code: 'INVALID_TRANSITION' });
  });
});

describe('close', () => {
  it('PUBLISHED → CLOSED', async () => {
    const draft = await service.createDraft(A, input());
    await service.publish(A, draft.id);
    expect(await service.close(A, draft.id)).toMatchObject({ status: 'CLOSED', displayStatus: 'CLOSED' });
  });

  it('không đóng tin DRAFT', async () => {
    const draft = await service.createDraft(A, input());
    await expect(service.close(A, draft.id)).rejects.toMatchObject({ code: 'INVALID_TRANSITION' });
  });

  it('đóng được tin đã hết hạn', async () => {
    const draft = await service.createDraft(A, input());
    await service.publish(A, draft.id);
    now = new Date('2026-12-01T00:00:00Z');
    expect(await service.close(A, draft.id)).toMatchObject({ status: 'CLOSED' });
  });
});

describe('update', () => {
  it.each(['DRAFT', 'PUBLISHED'] as const)('sửa được tin %s, giữ nguyên trạng thái', async (status) => {
    const draft = await service.createDraft(A, input());
    if (status === 'PUBLISHED') await service.publish(A, draft.id);
    const updated = await service.update(A, draft.id, input({ title: 'Senior TypeScript', salaryMax: null }));
    expect(updated).toMatchObject({ title: 'Senior TypeScript', salaryMax: null, status });
  });

  it('không sửa được tin CLOSED', async () => {
    const draft = await service.createDraft(A, input());
    await service.publish(A, draft.id);
    await service.close(A, draft.id);
    await expect(service.update(A, draft.id, input({ title: 'Đổi tên' }))).rejects.toMatchObject({ code: 'NOT_EDITABLE' });
    expect((await service.getMine(A, draft.id))?.title).toBe(input().title);
  });

  it('từ chối salaryMin > salaryMax', async () => {
    const draft = await service.createDraft(A, input());
    await expect(service.update(A, draft.id, input({ salaryMin: 2, salaryMax: 1 }))).rejects.toMatchObject({
      code: 'INVALID_SALARY',
    });
  });

  it('gia hạn tin hết hạn làm tin hiện lại PUBLISHED', async () => {
    const draft = await service.createDraft(A, input());
    await service.publish(A, draft.id);
    now = new Date('2026-12-01T00:00:00Z');
    expect((await service.getMine(A, draft.id))?.displayStatus).toBe('EXPIRED');
    const extended = await service.update(A, draft.id, input({ applicationDeadline: '2027-01-01T00:00:00Z' }));
    expect(extended.displayStatus).toBe('PUBLISHED');
  });
});

describe('quyền sở hữu', () => {
  it('Employer khác không đọc, sửa, đăng, đóng được tin của mình', async () => {
    const draft = await service.createDraft(A, input());
    expect(await service.getMine(B, draft.id)).toBeNull();
    for (const act of [
      () => service.update(B, draft.id, input()),
      () => service.publish(B, draft.id),
      () => service.close(B, draft.id),
    ]) {
      await expect(act()).rejects.toMatchObject({ code: 'NOT_FOUND' });
    }
  });

  it('id không tồn tại → NOT_FOUND / null', async () => {
    const missing = 'missing' as JobPostingId;
    expect(await service.getMine(A, missing)).toBeNull();
    await expect(service.publish(A, missing)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('listMine', () => {
  it('chỉ trả tin của mình, mới nhất trước, có EXPIRED', async () => {
    const old = await service.createDraft(A, input({ title: 'Tin cũ đã hết hạn', applicationDeadline: '2026-10-20T00:00:00Z' }));
    await service.publish(A, old.id);
    now = new Date('2026-10-17T00:00:00Z');
    const fresh = await service.createDraft(A, input({ title: 'Tin mới nháp' }));
    await service.createDraft(B, input({ title: 'Tin của Globex' }));
    now = new Date('2026-10-21T00:00:00Z');

    const mine = await service.listMine(A);
    expect(mine.map((p) => [p.id, p.displayStatus])).toEqual([
      [fresh.id, 'DRAFT'],
      [old.id, 'EXPIRED'],
    ]);
  });
});

async function published(overrides: Partial<PostingInput> = {}) {
  const draft = await service.createDraft(A, input(overrides));
  return service.publish(A, draft.id);
}

describe('listOpen', () => {
  it('chỉ có tin PUBLISHED chưa hết hạn, mới nhất trước, kèm tên công ty', async () => {
    await service.createDraft(A, input({ title: 'Tin nháp' }));
    const closed = await published({ title: 'Tin đã đóng' });
    await service.close(A, closed.id);
    await published({ title: 'Tin sắp hết hạn', applicationDeadline: '2026-10-17T00:00:00Z' });
    const older = await published({ title: 'Tin cũ hơn' });
    const newer = await published({ title: 'Tin mới hơn' });
    now = new Date('2026-10-18T00:00:00Z');

    const page = await service.listOpen({ page: 1 });
    expect(page).toMatchObject({ total: 2, page: 1, pageSize: 20 });
    expect(page.items.map((p) => p.id)).toEqual([newer.id, older.id]);
    expect(page.items[0]).toEqual({
      id: newer.id,
      title: 'Tin mới hơn',
      companyName: 'ACME',
      location: 'Hà Nội',
      employmentType: 'FULL_TIME',
      salaryMin: 15_000_000,
      salaryMax: 25_000_000,
      applicationDeadline: '2026-11-01T00:00:00.000Z',
      createdAt: newer.createdAt,
      industry: 'IT_SOFTWARE',
      level: 'JUNIOR',
      experienceYears: 1,
      skills: ['TypeScript', 'React'],
      companyLogoUrl: null,
    });
  });

  it('tin hết hạn đúng thời điểm deadline vẫn còn mở, qua deadline thì ẩn', async () => {
    await published({ applicationDeadline: '2026-10-17T00:00:00.000Z' });
    now = new Date('2026-10-17T00:00:00.000Z');
    expect((await service.listOpen({ page: 1 })).total).toBe(1);
    now = new Date('2026-10-17T00:00:00.001Z');
    expect((await service.listOpen({ page: 1 })).total).toBe(0);
  });

  it('phân trang 20 tin mỗi trang', async () => {
    const ids: string[] = [];
    for (let i = 0; i < 45; i++) ids.unshift((await published({ title: `Tin số ${i}` })).id);

    const pages = await Promise.all([1, 2, 3, 4].map((n) => service.listOpen({ page: n })));
    expect(pages.map((p) => p.items.length)).toEqual([20, 20, 5, 0]);
    expect(pages.flatMap((p) => p.items.map((i) => i.id))).toEqual(ids);
    expect(pages.every((p) => p.total === 45)).toBe(true);
    expect(pages[2].page).toBe(3);
  });
});

describe('listOpen với Search Filter', () => {
  const titles = async (filter: Parameters<JobPostingService['listOpen']>[0]) =>
    (await service.listOpen(filter)).items.map((p) => p.title);

  it('từ khóa không dấu khớp tiêu đề có dấu, không phân biệt hoa thường, gồm cả "đ"', async () => {
    await published({ title: 'Kế toán tổng hợp' });
    await published({ title: 'Điều dưỡng viên' });
    await published({ title: 'Lập trình viên' });
    expect(await titles({ q: 'ke toan' })).toEqual(['Kế toán tổng hợp']);
    expect(await titles({ q: 'DIEU DUONG' })).toEqual(['Điều dưỡng viên']);
    expect(await titles({ q: 'Kế Toán' })).toEqual(['Kế toán tổng hợp']);
  });

  it('từ khóa khớp cả mô tả; từ khóa rỗng hoặc toàn khoảng trắng = không lọc', async () => {
    await published({ title: 'Nhân viên văn phòng', description: 'Làm báo cáo thuế và sổ sách kế toán hằng tháng.' });
    await published({ title: 'Lập trình viên' });
    expect(await titles({ q: 'so sach' })).toEqual(['Nhân viên văn phòng']);
    expect(await titles({ q: '   ' })).toHaveLength(2);
  });

  it('ký tự % và _ trong từ khóa là chữ thường, không phải wildcard', async () => {
    await published({ title: 'Lập trình viên' });
    expect(await titles({ q: '%' })).toEqual([]);
    expect(await titles({ q: '_' })).toEqual([]);
  });

  it('địa điểm khớp dạng chứa, không cần dấu và hoa thường', async () => {
    await published({ title: 'Ở Hà Nội', location: 'Quận Ba Đình, Hà Nội' });
    await published({ title: 'Ở Hà Nam', location: 'Hà Nam' });
    expect(await titles({ location: 'ha noi' })).toEqual(['Ở Hà Nội']);
    expect(await titles({ location: 'Hà' })).toEqual(['Ở Hà Nam', 'Ở Hà Nội']);
    expect(await titles({ location: '%' })).toEqual([]);
  });

  it('lương tối thiểu: khớp tin có salaryMax ≥ mức yêu cầu hoặc salaryMax null (thỏa thuận)', async () => {
    await published({ title: 'Thấp', salaryMin: 5_000_000, salaryMax: 8_000_000 });
    await published({ title: 'Đúng mức', salaryMin: 8_000_000, salaryMax: 10_000_000 });
    await published({ title: 'Thỏa thuận', salaryMin: null, salaryMax: null });
    await published({ title: 'Từ 12 triệu', salaryMin: 12_000_000, salaryMax: null });
    expect(await titles({ minSalary: 10_000_000 })).toEqual(['Từ 12 triệu', 'Thỏa thuận', 'Đúng mức']);
  });

  it('kết hợp nhiều bộ lọc (AND), total đếm sau khi lọc, vẫn ẩn tin không mở', async () => {
    await published({ title: 'Kế toán trưởng', location: 'Hà Nội', employmentType: 'FULL_TIME', salaryMax: 30_000_000 });
    await published({ title: 'Kế toán part-time', location: 'Hà Nội', employmentType: 'PART_TIME', salaryMax: 30_000_000 });
    await published({ title: 'Kế toán TP.HCM', location: 'TP. Hồ Chí Minh', employmentType: 'FULL_TIME', salaryMax: 30_000_000 });
    await published({ title: 'Kế toán lương thấp', location: 'Hà Nội', employmentType: 'FULL_TIME', salaryMin: null, salaryMax: 9_000_000 });
    await service.createDraft(A, input({ title: 'Kế toán nháp', salaryMax: 30_000_000 }));
    const page = await service.listOpen({ q: 'ke toan', location: 'Hà Nội', employmentType: 'FULL_TIME', minSalary: 10_000_000 });
    expect(page.items.map((p) => p.title)).toEqual(['Kế toán trưởng']);
    expect(page.total).toBe(1);
  });

  it('ngành nghề và cấp bậc khớp chính xác', async () => {
    await published({ title: 'Dev junior', industry: 'IT_SOFTWARE', level: 'JUNIOR' });
    await published({ title: 'Dev senior', industry: 'IT_SOFTWARE', level: 'SENIOR' });
    await published({ title: 'Sales junior', industry: 'SALES', level: 'JUNIOR' });
    expect(await titles({ industry: 'IT_SOFTWARE' })).toEqual(['Dev senior', 'Dev junior']);
    expect(await titles({ level: 'JUNIOR' })).toEqual(['Sales junior', 'Dev junior']);
    expect(await titles({ industry: 'IT_SOFTWARE', level: 'SENIOR' })).toEqual(['Dev senior']);
  });

  it('maxExperience: tin yêu cầu kinh nghiệm ≤ giá trị, 0 = chỉ tin không yêu cầu', async () => {
    await published({ title: '0 năm', experienceYears: 0 });
    await published({ title: '2 năm', experienceYears: 2 });
    await published({ title: '5 năm', experienceYears: 5 });
    expect(await titles({ maxExperience: 2 })).toEqual(['2 năm', '0 năm']);
    expect(await titles({ maxExperience: 0 })).toEqual(['0 năm']);
  });

  it('skill: bằng một kỹ năng của tin, không dấu, không phân biệt hoa thường, không khớp một phần', async () => {
    await published({ title: 'Kế toán', skills: ['Kế toán thuế', 'Excel'] });
    await published({ title: 'Dev', skills: ['TypeScript'] });
    expect(await titles({ skill: 'ke toan thue' })).toEqual(['Kế toán']);
    expect(await titles({ skill: 'EXCEL' })).toEqual(['Kế toán']);
    expect(await titles({ skill: 'Type' })).toEqual([]);
    expect(await titles({ skill: '  ' })).toHaveLength(2);
  });

  it('sort salary_desc: theo salaryMax giảm dần, thỏa thuận (null) ở cuối', async () => {
    await published({ title: 'Thỏa thuận', salaryMin: null, salaryMax: null });
    await published({ title: '20 triệu', salaryMin: null, salaryMax: 20_000_000 });
    await published({ title: '40 triệu', salaryMin: null, salaryMax: 40_000_000 });
    await published({ title: 'Từ 30 triệu', salaryMin: 30_000_000, salaryMax: null });
    expect(await titles({ sort: 'salary_desc' })).toEqual(['40 triệu', '20 triệu', 'Từ 30 triệu', 'Thỏa thuận']);
  });

  it('sort deadline_asc: hạn gần nhất trước; mặc định newest', async () => {
    await published({ title: 'Hạn xa', applicationDeadline: '2026-12-01T00:00:00Z' });
    await published({ title: 'Hạn gần', applicationDeadline: '2026-10-20T00:00:00Z' });
    await published({ title: 'Hạn giữa', applicationDeadline: '2026-11-01T00:00:00Z' });
    expect(await titles({ sort: 'deadline_asc' })).toEqual(['Hạn gần', 'Hạn giữa', 'Hạn xa']);
    expect(await titles({})).toEqual(['Hạn giữa', 'Hạn gần', 'Hạn xa']);
    expect(await titles({ sort: 'newest' })).toEqual(['Hạn giữa', 'Hạn gần', 'Hạn xa']);
  });

  it('không truyền page → trang 1', async () => {
    await published();
    expect(await service.listOpen({})).toMatchObject({ page: 1, total: 1 });
  });
});

describe('getPublic', () => {
  it('tin đang mở: đầy đủ mô tả, isOpen = true', async () => {
    const posting = await published();
    expect(await service.getPublic(posting.id)).toEqual({ ...posting, isOpen: true });
  });

  it('tin CLOSED và EXPIRED vẫn xem được nhưng isOpen = false', async () => {
    const closed = await published();
    await service.close(A, closed.id);
    const expired = await published({ applicationDeadline: '2026-10-17T00:00:00Z' });
    now = new Date('2026-10-18T00:00:00Z');
    expect(await service.getPublic(closed.id)).toMatchObject({ displayStatus: 'CLOSED', isOpen: false });
    expect(await service.getPublic(expired.id)).toMatchObject({ displayStatus: 'EXPIRED', isOpen: false });
  });

  it('tin DRAFT và id không tồn tại → null', async () => {
    const draft = await service.createDraft(A, input());
    expect(await service.getPublic(draft.id)).toBeNull();
    expect(await service.getPublic('missing' as JobPostingId)).toBeNull();
  });
});

describe('listRelated', () => {
  it('≤ 6 tin đang mở cùng ngành, mới nhất trước, trừ chính tin đó', async () => {
    const self = await published({ title: 'Chính nó', industry: 'SALES' });
    for (let i = 0; i < 7; i++) await published({ title: `Sales ${i}`, industry: 'SALES' });
    await published({ title: 'Dev', industry: 'IT_SOFTWARE' });
    const closed = await published({ title: 'Sales đã đóng', industry: 'SALES' });
    await service.close(A, closed.id);
    expect((await service.listRelated(self.id)).map((p) => p.title)).toEqual(
      ['Sales 6', 'Sales 5', 'Sales 4', 'Sales 3', 'Sales 2', 'Sales 1'],
    );
  });

  it('tin DRAFT hoặc không tồn tại → []', async () => {
    await published({ industry: 'SALES' });
    const draft = await service.createDraft(A, input({ industry: 'SALES' }));
    expect(await service.listRelated(draft.id)).toEqual([]);
    expect(await service.listRelated('missing' as JobPostingId)).toEqual([]);
  });
});
