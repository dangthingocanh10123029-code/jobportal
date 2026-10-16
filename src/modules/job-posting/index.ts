import { JobPostingError } from './domain/errors';
import { displayStatus, EDITABLE, TRANSITIONS } from './domain/status';
import type {
  Clock,
  EmployerId,
  IJobPostingRepository,
  JobPosting,
  JobPostingId,
  PostingInput,
  StoredJobPosting,
} from './domain/types';

export { JobPostingError, type JobPostingErrorCode } from './domain/errors';
export type * from './domain/types';

/** Employer-side posting lifecycle: DRAFT --publish--> PUBLISHED --close--> CLOSED. */
export class JobPostingService {
  constructor(
    private readonly repo: IJobPostingRepository,
    private readonly now: Clock = () => new Date(),
  ) {}

  async createDraft(employerId: EmployerId, input: PostingInput): Promise<JobPosting> {
    assertSalary(input);
    return this.view(await this.repo.insert(employerId, input));
  }

  async update(employerId: EmployerId, id: JobPostingId, input: PostingInput): Promise<JobPosting> {
    const posting = await this.owned(employerId, id);
    if (!EDITABLE.includes(posting.status)) throw new JobPostingError('NOT_EDITABLE');
    assertSalary(input);
    return this.view(await this.repo.update(id, input));
  }

  async publish(employerId: EmployerId, id: JobPostingId): Promise<JobPosting> {
    const posting = await this.owned(employerId, id);
    this.assertTransition(posting, 'publish');
    if (Date.parse(posting.applicationDeadline) <= this.now().getTime()) {
      throw new JobPostingError('DEADLINE_NOT_IN_FUTURE');
    }
    return this.view(await this.repo.update(id, { status: TRANSITIONS.publish.to }));
  }

  async close(employerId: EmployerId, id: JobPostingId): Promise<JobPosting> {
    const posting = await this.owned(employerId, id);
    this.assertTransition(posting, 'close');
    return this.view(await this.repo.update(id, { status: TRANSITIONS.close.to }));
  }

  async listMine(employerId: EmployerId): Promise<JobPosting[]> {
    return (await this.repo.listByEmployer(employerId)).map((p) => this.view(p));
  }

  async getMine(employerId: EmployerId, id: JobPostingId): Promise<JobPosting | null> {
    const posting = await this.repo.findById(id);
    return posting?.employerId === employerId ? this.view(posting) : null;
  }

  private async owned(employerId: EmployerId, id: JobPostingId): Promise<StoredJobPosting> {
    const posting = await this.repo.findById(id);
    // Someone else's posting looks the same as a missing one.
    if (posting?.employerId !== employerId) throw new JobPostingError('NOT_FOUND');
    return posting;
  }

  private assertTransition(posting: StoredJobPosting, action: keyof typeof TRANSITIONS) {
    if (posting.status !== TRANSITIONS[action].from) throw new JobPostingError('INVALID_TRANSITION');
  }

  private view(posting: StoredJobPosting): JobPosting {
    return { ...posting, displayStatus: displayStatus(posting.status, posting.applicationDeadline, this.now()) };
  }
}

function assertSalary({ salaryMin, salaryMax }: PostingInput) {
  if (salaryMin !== null && salaryMax !== null && salaryMin > salaryMax) throw new JobPostingError('INVALID_SALARY');
}
