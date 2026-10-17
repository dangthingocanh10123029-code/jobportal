import { beforeEach, describe, expect, it } from 'vitest';
import { fromPartial } from '@total-typescript/shoehorn';
import { InMemoryJobPostingRepository } from '@/modules/job-posting/adapters/in-memory';
import type { ApplicationId } from '@/modules/application';
import type { EmployerId, JobPostingId, PostingInput } from '@/modules/job-posting';
import { InMemoryCandidateRepository } from './adapters/in-memory';
import { CandidateService, type CandidateId, type CandidateProfile } from './index';

const EMPLOYER = 'employer-a' as EmployerId;
const OTHER_EMPLOYER = 'employer-b' as EmployerId;
const ANNA = 'candidate-anna' as CandidateId;

const anna: CandidateProfile = {
  userId: ANNA, fullName: 'Anna Nguyễn', phone: null, headline: null, skills: [], experience: null, education: null,
};

let now: Date;
let postings: InMemoryJobPostingRepository;
let repo: InMemoryCandidateRepository;
let service: CandidateService;

beforeEach(() => {
  now = new Date('2026-10-17T00:00:00Z');
  postings = new InMemoryJobPostingRepository({ [EMPLOYER]: 'ACME' }, () => now);
  repo = new InMemoryCandidateRepository(postings, [anna], () => now);
  service = new CandidateService(repo, () => now);
});

async function posting(status: 'DRAFT' | 'PUBLISHED' | 'CLOSED', deadline = '2026-11-01T00:00:00.000Z') {
  const { id } = await postings.insert(EMPLOYER, fromPartial<PostingInput>({ title: 'Tin', applicationDeadline: deadline }));
  if (status !== 'DRAFT') await postings.update(id, { status });
  return id;
}

describe('toggleSaved', () => {
  it('lần một lưu, lần hai bỏ lưu', async () => {
    const id = await posting('PUBLISHED');
    expect(await service.toggleSaved(ANNA, id)).toEqual({ saved: true });
    expect(await service.listSavedIds(ANNA)).toEqual([id]);
    expect(await service.toggleSaved(ANNA, id)).toEqual({ saved: false });
    expect(await service.listSavedIds(ANNA)).toEqual([]);
  });

  it('hai lần lưu cùng lúc không tạo bản trùng', async () => {
    const id = await posting('PUBLISHED');
    await Promise.all([repo.addSaved(ANNA, id), repo.addSaved(ANNA, id)]);
    expect(await service.listSavedIds(ANNA)).toEqual([id]);
  });

  it('lưu được tin CLOSED; tin DRAFT hoặc không tồn tại → null', async () => {
    expect(await service.toggleSaved(ANNA, await posting('CLOSED'))).toEqual({ saved: true });
    expect(await service.toggleSaved(ANNA, await posting('DRAFT'))).toBeNull();
    expect(await service.toggleSaved(ANNA, 'missing' as JobPostingId)).toBeNull();
    expect(await service.listSavedIds(ANNA)).toHaveLength(1);
  });
});

describe('listSaved', () => {
  it('mới lưu trước, kèm savedAt và isOpen (tin hết hạn/đóng = false)', async () => {
    const open = await posting('PUBLISHED');
    const expired = await posting('PUBLISHED', '2026-10-16T00:00:00.000Z');
    const closed = await posting('CLOSED');
    for (const [id, at] of [[open, '01'], [expired, '02'], [closed, '03']] as const) {
      now = new Date(`2026-10-${at}T00:00:00Z`);
      await service.toggleSaved(ANNA, id);
    }
    now = new Date('2026-10-17T00:00:00Z');
    const saved = await service.listSaved(ANNA);
    expect(saved.map((p) => [p.id, p.isOpen, p.savedAt])).toEqual([
      [closed, false, '2026-10-03T00:00:00.000Z'],
      [expired, false, '2026-10-02T00:00:00.000Z'],
      [open, true, '2026-10-01T00:00:00.000Z'],
    ]);
    expect(saved[0]).not.toHaveProperty('status');
  });
});

describe('getApplicantProfile', () => {
  it('chỉ Employer chủ tin của đơn đọc được hồ sơ ứng viên', async () => {
    const id = await posting('PUBLISHED');
    repo.addApplication({ id: 'application-1', candidateId: ANNA, jobPostingId: id });
    await service.updateProfile(ANNA, { headline: 'Frontend dev', skills: ['React'] });

    expect(await service.getApplicantProfile(EMPLOYER, 'application-1' as ApplicationId)).toEqual({
      ...anna, headline: 'Frontend dev', skills: ['React'],
    });
    expect(await service.getApplicantProfile(OTHER_EMPLOYER, 'application-1' as ApplicationId)).toBeNull();
    expect(await service.getApplicantProfile(EMPLOYER, 'application-2' as ApplicationId)).toBeNull();
  });
});

describe('updateProfile', () => {
  it('chỉ đổi trường được truyền, null xóa trường', async () => {
    await service.updateProfile(ANNA, { headline: 'Dev', experience: '3 năm' });
    expect(await service.updateProfile(ANNA, { experience: null, education: 'ĐH Bách khoa' })).toEqual({
      ...anna, headline: 'Dev', education: 'ĐH Bách khoa',
    });
    expect(await service.updateProfile('nobody' as CandidateId, { headline: 'X' })).toBeNull();
  });
});
