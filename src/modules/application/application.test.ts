import { beforeEach, describe, expect, it } from 'vitest';
import { fromPartial } from '@total-typescript/shoehorn';
import { InMemoryJobPostingRepository } from '@/modules/job-posting/adapters/in-memory';
import type { EmployerId, JobPostingId, PostingInput } from '@/modules/job-posting';
import { InMemoryApplicationRepository } from './adapters/in-memory';
import { allowedNextStatuses, ApplicationService, type ApplicationId, type CandidateId } from './index';

const EMPLOYER = 'employer-a' as EmployerId;
const ANNA = 'candidate-anna' as CandidateId;
const BINH = 'candidate-binh' as CandidateId;
const NOW = new Date('2026-10-16T00:00:00Z');

let now: Date;
let postings: InMemoryJobPostingRepository;
let repo: InMemoryApplicationRepository;
let service: ApplicationService;

beforeEach(() => {
  now = NOW;
  postings = new InMemoryJobPostingRepository({ [EMPLOYER]: 'ACME' }, () => now);
  repo = new InMemoryApplicationRepository(postings, () => now, {
    [ANNA]: { fullName: 'Anna Nguyễn', phone: '0901234567' },
    [BINH]: { fullName: 'Bình Trần', phone: null },
  });
  service = new ApplicationService(repo);
});

async function posting(status: 'DRAFT' | 'PUBLISHED' | 'CLOSED', deadline = '2026-11-01T00:00:00.000Z') {
  const { id } = await postings.insert(EMPLOYER, fromPartial<PostingInput>({ title: `Tin ${deadline}`, applicationDeadline: deadline }));
  if (status !== 'DRAFT') await postings.update(id, { status });
  return id;
}

const resume = (candidate: CandidateId) => `${candidate}/cv.pdf`;

describe('submit', () => {
  it('nộp vào tin đang mở: Application SUBMITTED kèm một Status Change đầu tiên', async () => {
    const postingId = await posting('PUBLISHED');
    const application = await service.submit(ANNA, postingId, resume(ANNA));

    expect(application).toMatchObject({ jobPostingId: postingId, candidateId: ANNA, status: 'SUBMITTED' });
    expect((await service.getMineWithHistory(ANNA, application.id as ApplicationId))?.history).toEqual([
      { fromStatus: null, toStatus: 'SUBMITTED', changedByRole: 'CANDIDATE', changedAt: application.createdAt },
    ]);
  });

  it('nộp lần hai cùng tin bị từ chối (ADR-0002)', async () => {
    const postingId = await posting('PUBLISHED');
    await service.submit(ANNA, postingId, resume(ANNA));
    await expect(service.submit(ANNA, postingId, resume(ANNA))).rejects.toMatchObject({
      code: 'ALREADY_APPLIED',
      message: 'Bạn đã nộp hồ sơ cho tin này rồi',
    });
  });

  it('hai lần bấm nộp cùng lúc chỉ tạo một Application', async () => {
    const postingId = await posting('PUBLISHED');
    const results = await Promise.allSettled([
      service.submit(ANNA, postingId, resume(ANNA)),
      service.submit(ANNA, postingId, resume(ANNA)),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual(['fulfilled', 'rejected']);
  });

  it.each([
    ['DRAFT', () => posting('DRAFT')],
    ['CLOSED', () => posting('CLOSED')],
    ['Expired', () => posting('PUBLISHED', '2026-10-15T23:59:59.000Z')],
    ['không tồn tại', async () => 'posting-404' as JobPostingId],
  ])('tin %s bị từ chối, không tạo Application', async (_, makePosting) => {
    const postingId = await makePosting();
    await expect(service.submit(ANNA, postingId, resume(ANNA))).rejects.toMatchObject({
      code: 'POSTING_NOT_OPEN',
      message: 'Tin tuyển dụng không còn nhận hồ sơ',
    });
    expect(await service.getMine(ANNA, postingId)).toBeNull();
  });

  it('hạn nộp đúng bằng bây giờ vẫn còn nhận (ADR-0001)', async () => {
    const postingId = await posting('PUBLISHED', NOW.toISOString());
    await expect(service.submit(ANNA, postingId, resume(ANNA))).resolves.toMatchObject({ status: 'SUBMITTED' });
  });

  it('Candidate khác vẫn nộp được cùng tin', async () => {
    const postingId = await posting('PUBLISHED');
    await service.submit(ANNA, postingId, resume(ANNA));
    await expect(service.submit(BINH, postingId, resume(BINH))).resolves.toMatchObject({ candidateId: BINH });
  });
});

describe('getMine / getMineWithHistory', () => {
  it('chỉ chủ đơn thấy đơn và lịch sử của mình', async () => {
    const postingId = await posting('PUBLISHED');
    const application = await service.submit(ANNA, postingId, resume(ANNA));
    expect(await service.getMine(ANNA, postingId)).toEqual(application);
    expect(await service.getMine(BINH, postingId)).toBeNull();
    expect(await service.getMineWithHistory(BINH, application.id as ApplicationId)).toBeNull();
  });
});

describe('listMine / getMineWithHistory', () => {
  it('liệt kê đơn của Candidate, mới nhất trước, kèm tiêu đề tin và tên công ty', async () => {
    const first = await service.submit(ANNA, await posting('PUBLISHED'), resume(ANNA));
    now = new Date('2026-10-17T00:00:00Z');
    const second = await service.submit(ANNA, await posting('PUBLISHED', '2026-12-01T00:00:00.000Z'), resume(ANNA));
    await service.submit(BINH, first.jobPostingId as JobPostingId, resume(BINH));

    expect(await service.listMine(ANNA)).toEqual([
      { ...second, postingTitle: 'Tin 2026-12-01T00:00:00.000Z', companyName: 'ACME' },
      { ...first, postingTitle: 'Tin 2026-11-01T00:00:00.000Z', companyName: 'ACME' },
    ]);
  });

  it('chi tiết đơn kèm lịch sử; Candidate khác nhận null', async () => {
    const application = await service.submit(ANNA, await posting('PUBLISHED'), resume(ANNA));
    const id = application.id as ApplicationId;
    expect(await service.getMineWithHistory(ANNA, id)).toEqual({
      ...application,
      postingTitle: 'Tin 2026-11-01T00:00:00.000Z',
      companyName: 'ACME',
      history: [{ fromStatus: null, toStatus: 'SUBMITTED', changedByRole: 'CANDIDATE', changedAt: application.createdAt }],
    });
    expect(await service.getMineWithHistory(BINH, id)).toBeNull();
    expect(await service.getMineWithHistory(ANNA, 'application-404' as ApplicationId)).toBeNull();
  });
});

describe('withdraw', () => {
  async function applicationIn(status: 'SUBMITTED' | 'REVIEWING' | 'INTERVIEWING' | 'OFFERED' | 'HIRED' | 'REJECTED') {
    const { id } = await service.submit(ANNA, await posting('PUBLISHED'), resume(ANNA));
    const path = { SUBMITTED: [], REVIEWING: ['REVIEWING'], INTERVIEWING: ['REVIEWING', 'INTERVIEWING'],
      OFFERED: ['REVIEWING', 'INTERVIEWING', 'OFFERED'], HIRED: ['REVIEWING', 'INTERVIEWING', 'OFFERED', 'HIRED'],
      REJECTED: ['REJECTED'] } as const;
    for (const to of path[status]) await repo.changeStatus(id as ApplicationId, to, { userId: EMPLOYER, role: 'EMPLOYER' });
    return id as ApplicationId;
  }

  it.each(['SUBMITTED', 'REVIEWING', 'INTERVIEWING', 'OFFERED'] as const)(
    'rút đơn đang %s: WITHDRAWN và ghi Status Change',
    async (status) => {
      const id = await applicationIn(status);
      now = new Date('2026-10-18T00:00:00Z');
      expect(await service.withdraw(ANNA, id)).toMatchObject({ status: 'WITHDRAWN', updatedAt: now.toISOString() });
      expect((await service.getMineWithHistory(ANNA, id))?.history.at(-1)).toEqual({
        fromStatus: status,
        toStatus: 'WITHDRAWN',
        changedByRole: 'CANDIDATE',
        changedAt: now.toISOString(),
      });
    },
  );

  it.each(['HIRED', 'REJECTED'] as const)('đơn đã %s không rút được', async (status) => {
    const id = await applicationIn(status);
    await expect(service.withdraw(ANNA, id)).rejects.toMatchObject({ code: 'INVALID_TRANSITION' });
    expect((await service.getMineWithHistory(ANNA, id))?.status).toBe(status);
  });

  it('đơn đã WITHDRAWN không rút lại được', async () => {
    const id = await applicationIn('SUBMITTED');
    await service.withdraw(ANNA, id);
    await expect(service.withdraw(ANNA, id)).rejects.toMatchObject({ code: 'INVALID_TRANSITION' });
  });

  it('không rút được đơn của Candidate khác hoặc đơn không tồn tại', async () => {
    const id = await applicationIn('SUBMITTED');
    await expect(service.withdraw(BINH, id)).rejects.toMatchObject({ code: 'APPLICATION_NOT_FOUND' });
    await expect(service.withdraw(ANNA, 'application-404' as ApplicationId)).rejects.toMatchObject({
      code: 'APPLICATION_NOT_FOUND',
    });
    expect((await service.getMineWithHistory(ANNA, id))?.status).toBe('SUBMITTED');
  });

  it('hai lần rút cùng lúc chỉ ghi một Status Change', async () => {
    const id = await applicationIn('SUBMITTED');
    const results = await Promise.allSettled([service.withdraw(ANNA, id), service.withdraw(ANNA, id)]);
    expect(results.map((r) => r.status).sort()).toEqual(['fulfilled', 'rejected']);
    expect((await service.getMineWithHistory(ANNA, id))?.history).toHaveLength(2);
  });
});

describe('changeStatus (RPC dùng chung với ticket 07)', () => {
  it('Candidate không đổi sang trạng thái khác WITHDRAWN, Employer không rút thay', async () => {
    const { id } = await service.submit(ANNA, await posting('PUBLISHED'), resume(ANNA));
    await expect(repo.changeStatus(id as ApplicationId, 'REVIEWING', { userId: ANNA, role: 'CANDIDATE' })).rejects.toMatchObject({
      code: 'INVALID_TRANSITION',
    });
    await expect(repo.changeStatus(id as ApplicationId, 'WITHDRAWN', { userId: EMPLOYER, role: 'EMPLOYER' })).rejects.toMatchObject({
      code: 'INVALID_TRANSITION',
    });
  });

  it('Employer không phải chủ tin không đổi được', async () => {
    const { id } = await service.submit(ANNA, await posting('PUBLISHED'), resume(ANNA));
    await expect(repo.changeStatus(id as ApplicationId, 'REVIEWING', { userId: 'employer-b', role: 'EMPLOYER' })).rejects.toMatchObject({
      code: 'APPLICATION_NOT_FOUND',
    });
  });
});

describe('Employer xử lý đơn (ticket 07)', () => {
  const OTHER = 'employer-b' as EmployerId;

  it('liệt kê đơn của tin, mới nhất trước, kèm tên và số điện thoại Candidate', async () => {
    const postingId = await posting('PUBLISHED');
    const anna = await service.submit(ANNA, postingId, resume(ANNA));
    now = new Date('2026-10-17T00:00:00Z');
    const binh = await service.submit(BINH, postingId, resume(BINH));
    await service.submit(ANNA, await posting('PUBLISHED'), resume(ANNA));

    expect(await service.listForPosting(EMPLOYER, postingId)).toEqual([
      { ...binh, candidateName: 'Bình Trần', candidatePhone: null },
      { ...anna, candidateName: 'Anna Nguyễn', candidatePhone: '0901234567' },
    ]);
  });

  it('tin chưa có đơn → mảng rỗng; không phải chủ tin hoặc tin không tồn tại → null', async () => {
    const postingId = await posting('PUBLISHED');
    expect(await service.listForPosting(EMPLOYER, postingId)).toEqual([]);
    await service.submit(ANNA, postingId, resume(ANNA));
    expect(await service.listForPosting(OTHER, postingId)).toBeNull();
    expect(await service.listForPosting(EMPLOYER, 'posting-404' as JobPostingId)).toBeNull();
  });

  // Every (from, to) pair: legal for Employer exactly when allowedNextStatuses says so.
  const STATUSES = ['SUBMITTED', 'REVIEWING', 'INTERVIEWING', 'OFFERED', 'HIRED', 'REJECTED', 'WITHDRAWN'] as const;
  const PATH = { SUBMITTED: [], REVIEWING: ['REVIEWING'], INTERVIEWING: ['REVIEWING', 'INTERVIEWING'],
    OFFERED: ['REVIEWING', 'INTERVIEWING', 'OFFERED'], HIRED: ['REVIEWING', 'INTERVIEWING', 'OFFERED', 'HIRED'],
    REJECTED: ['REJECTED'], WITHDRAWN: [] } as const;

  async function applicationIn(status: (typeof STATUSES)[number]) {
    const { id } = await service.submit(ANNA, await posting('PUBLISHED'), resume(ANNA));
    for (const to of PATH[status]) await service.changeStatus(EMPLOYER, id as ApplicationId, to);
    if (status === 'WITHDRAWN') await service.withdraw(ANNA, id as ApplicationId);
    return id as ApplicationId;
  }

  it.each(STATUSES.flatMap((from) => STATUSES.map((to) => [from, to] as const)))('%s → %s', async (from, to) => {
    const id = await applicationIn(from);
    const before = (await service.getMineWithHistory(ANNA, id))?.history;
    now = new Date('2026-10-18T00:00:00Z');
    if (allowedNextStatuses(from, 'EMPLOYER').includes(to)) {
      expect(await service.changeStatus(EMPLOYER, id, to)).toMatchObject({ status: to, updatedAt: now.toISOString() });
      expect((await service.getMineWithHistory(ANNA, id))?.history).toEqual([
        ...before!,
        { fromStatus: from, toStatus: to, changedByRole: 'EMPLOYER', changedAt: now.toISOString() },
      ]);
    } else {
      await expect(service.changeStatus(EMPLOYER, id, to)).rejects.toMatchObject({ code: 'INVALID_TRANSITION' });
      expect((await service.getMineWithHistory(ANNA, id))?.history).toEqual(before);
    }
  });

  it('Employer khác chủ tin không đổi được trạng thái, không lấy được Resume', async () => {
    const id = await applicationIn('SUBMITTED');
    await expect(service.changeStatus(OTHER, id, 'REVIEWING')).rejects.toMatchObject({ code: 'APPLICATION_NOT_FOUND' });
    expect(await service.getResumePath(OTHER, id)).toBeNull();
    expect((await service.getMineWithHistory(ANNA, id))?.status).toBe('SUBMITTED');
  });

  it('chủ tin lấy được đường dẫn Resume; đơn không tồn tại → null', async () => {
    const id = await applicationIn('SUBMITTED');
    expect(await service.getResumePath(EMPLOYER, id)).toBe(resume(ANNA));
    expect(await service.getResumePath(EMPLOYER, 'application-404' as ApplicationId)).toBeNull();
  });
});

// Spec "Application Status state machine": Employer makes every transition except WITHDRAWN; Candidate only WITHDRAWN.
describe('allowedNextStatuses', () => {
  it.each([
    ['SUBMITTED', ['REVIEWING', 'REJECTED'], ['WITHDRAWN']],
    ['REVIEWING', ['INTERVIEWING', 'REJECTED'], ['WITHDRAWN']],
    ['INTERVIEWING', ['OFFERED', 'REJECTED'], ['WITHDRAWN']],
    ['OFFERED', ['HIRED', 'REJECTED'], ['WITHDRAWN']],
    ['HIRED', [], []],
    ['REJECTED', [], []],
    ['WITHDRAWN', [], []],
  ] as const)('%s → Employer %j, Candidate %j', (status, employer, candidate) => {
    expect(allowedNextStatuses(status, 'EMPLOYER')).toEqual(employer);
    expect(allowedNextStatuses(status, 'CANDIDATE')).toEqual(candidate);
  });
});
