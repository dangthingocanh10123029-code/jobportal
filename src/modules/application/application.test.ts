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
let service: ApplicationService;

beforeEach(() => {
  now = NOW;
  postings = new InMemoryJobPostingRepository({}, () => now);
  service = new ApplicationService(new InMemoryApplicationRepository(postings, () => now));
});

async function posting(status: 'DRAFT' | 'PUBLISHED' | 'CLOSED', deadline = '2026-11-01T00:00:00.000Z') {
  const { id } = await postings.insert(EMPLOYER, fromPartial<PostingInput>({ applicationDeadline: deadline }));
  if (status !== 'DRAFT') await postings.update(id, { status });
  return id;
}

const resume = (candidate: CandidateId) => `${candidate}/cv.pdf`;

describe('submit', () => {
  it('nộp vào tin đang mở: Application SUBMITTED kèm một Status Change đầu tiên', async () => {
    const postingId = await posting('PUBLISHED');
    const application = await service.submit(ANNA, postingId, resume(ANNA));

    expect(application).toMatchObject({ jobPostingId: postingId, candidateId: ANNA, status: 'SUBMITTED' });
    expect(await service.getHistory(ANNA, application.id as ApplicationId)).toEqual([
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

describe('getMine / getHistory', () => {
  it('chỉ chủ đơn thấy đơn và lịch sử của mình', async () => {
    const postingId = await posting('PUBLISHED');
    const application = await service.submit(ANNA, postingId, resume(ANNA));
    expect(await service.getMine(ANNA, postingId)).toEqual(application);
    expect(await service.getMine(BINH, postingId)).toBeNull();
    expect(await service.getHistory(BINH, application.id as ApplicationId)).toBeNull();
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
