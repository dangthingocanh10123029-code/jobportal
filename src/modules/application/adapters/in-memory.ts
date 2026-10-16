import type { Clock, IJobPostingRepository, JobPostingId } from '@/modules/job-posting';
import { isOpen } from '@/modules/job-posting/domain/status';
import type { Actor, ApplicationStatus } from '@/actions/types';
import { ApplicationError } from '../domain/errors';
import { allowedNextStatuses } from '../domain/status';
import type { Application, ApplicationId, CandidateId, IApplicationRepository, StatusChange } from '../domain/types';

/** Mimics the submit_application / change_application_status RPCs against the posting store. */
export class InMemoryApplicationRepository implements IApplicationRepository {
  private readonly rows = new Map<ApplicationId, Application & { resumePath: string }>();
  private readonly changes = new Map<ApplicationId, StatusChange[]>();
  private nextId = 1;

  constructor(
    private readonly postings: IJobPostingRepository,
    private readonly now: Clock = () => new Date(),
  ) {}

  async submit(candidateId: CandidateId, jobPostingId: JobPostingId, resumePath: string) {
    const posting = await this.postings.findById(jobPostingId);
    // Everything below runs without awaiting, so it is atomic like the RPC's transaction.
    if (!posting || !isOpen(posting.status, posting.applicationDeadline, this.now())) {
      throw new ApplicationError('POSTING_NOT_OPEN');
    }
    if (this.find(candidateId, jobPostingId)) throw new ApplicationError('ALREADY_APPLIED');
    const at = this.now().toISOString();
    const row = {
      id: `application-${this.nextId++}` as ApplicationId,
      jobPostingId,
      candidateId,
      resumePath,
      status: 'SUBMITTED' as const,
      createdAt: at,
      updatedAt: at,
    };
    this.rows.set(row.id, row);
    this.changes.set(row.id, [{ fromStatus: null, toStatus: 'SUBMITTED', changedByRole: 'CANDIDATE', changedAt: at }]);
    return toApplication(row);
  }

  async findByPosting(candidateId: CandidateId, jobPostingId: JobPostingId) {
    const row = this.find(candidateId, jobPostingId);
    return row ? toApplication(row) : null;
  }

  async findById(id: ApplicationId) {
    const row = this.rows.get(id);
    return row ? toApplication(row) : null;
  }

  async listStatusChanges(id: ApplicationId) {
    return (this.changes.get(id) ?? []).map((c) => ({ ...c }));
  }

  async listByCandidate(candidateId: CandidateId) {
    const mine = [...this.rows.values()].filter((r) => r.candidateId === candidateId).reverse();
    return Promise.all(
      mine.map(async (row) => {
        const posting = await this.postings.findById(row.jobPostingId as JobPostingId);
        return { ...toApplication(row), postingTitle: posting?.title ?? '', companyName: posting?.companyName ?? '' };
      }),
    );
  }

  async changeStatus(id: ApplicationId, toStatus: ApplicationStatus, actor: Actor) {
    const current = this.rows.get(id);
    const posting = current && (await this.postings.findById(current.jobPostingId as JobPostingId));
    // From here on nothing awaits, so the check and the write are atomic like the RPC's row lock.
    const row = this.rows.get(id);
    const owns = actor.role === 'CANDIDATE' ? row?.candidateId === actor.userId : posting?.employerId === actor.userId;
    if (!row || !owns) throw new ApplicationError('APPLICATION_NOT_FOUND');
    if (!allowedNextStatuses(row.status, actor.role).includes(toStatus)) throw new ApplicationError('INVALID_TRANSITION');
    const at = this.now().toISOString();
    this.changes.get(id)?.push({ fromStatus: row.status, toStatus, changedByRole: actor.role, changedAt: at });
    Object.assign(row, { status: toStatus, updatedAt: at });
    return toApplication(row);
  }

  private find(candidateId: CandidateId, jobPostingId: JobPostingId) {
    return [...this.rows.values()].find((r) => r.candidateId === candidateId && r.jobPostingId === jobPostingId);
  }
}

function toApplication({ resumePath: _, ...application }: Application & { resumePath: string }): Application {
  return { ...application };
}
