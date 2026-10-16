import type { Clock, IJobPostingRepository, JobPostingId } from '@/modules/job-posting';
import { isOpen } from '@/modules/job-posting/domain/status';
import { ApplicationError } from '../domain/errors';
import type { Application, ApplicationId, CandidateId, IApplicationRepository, StatusChange } from '../domain/types';

/** Mimics the submit_application RPC: openness and the duplicate check against the posting store. */
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

  private find(candidateId: CandidateId, jobPostingId: JobPostingId) {
    return [...this.rows.values()].find((r) => r.candidateId === candidateId && r.jobPostingId === jobPostingId);
  }
}

function toApplication({ resumePath: _, ...application }: Application & { resumePath: string }): Application {
  return { ...application };
}
