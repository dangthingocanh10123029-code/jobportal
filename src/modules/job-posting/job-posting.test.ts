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

    const page = await service.listOpen(1);
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
    });
  });

  it('tin hết hạn đúng thời điểm deadline vẫn còn mở, qua deadline thì ẩn', async () => {
    await published({ applicationDeadline: '2026-10-17T00:00:00.000Z' });
    now = new Date('2026-10-17T00:00:00.000Z');
    expect((await service.listOpen(1)).total).toBe(1);
    now = new Date('2026-10-17T00:00:00.001Z');
    expect((await service.listOpen(1)).total).toBe(0);
  });

  it('phân trang 20 tin mỗi trang', async () => {
    const ids: string[] = [];
    for (let i = 0; i < 45; i++) ids.unshift((await published({ title: `Tin số ${i}` })).id);

    const pages = await Promise.all([1, 2, 3, 4].map((n) => service.listOpen(n)));
    expect(pages.map((p) => p.items.length)).toEqual([20, 20, 5, 0]);
    expect(pages.flatMap((p) => p.items.map((i) => i.id))).toEqual(ids);
    expect(pages.every((p) => p.total === 45)).toBe(true);
    expect(pages[2].page).toBe(3);
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
