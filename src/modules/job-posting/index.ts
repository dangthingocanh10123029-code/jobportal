import { JobPostingError } from './domain/errors';
import type { OpenPostingsPage, PostingDetail, PostingSummary, SearchFilter } from '@/actions/types';
import { displayStatus, EDITABLE, isOpen, TRANSITIONS } from './domain/status';
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

export const PAGE_SIZE = 20;
const RELATED_LIMIT = 6;
// ponytail: the company page shows at most this many open postings, unpaged; page it if an Employer outgrows it.
const COMPANY_POSTINGS_LIMIT = 100;

/** Posting lifecycle (DRAFT --publish--> PUBLISHED --close--> CLOSED) plus the public read side. */
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

  /** Public search: open postings matching every given criterion, sorted by `sort` (default newest). `page` starts at 1. */
  async listOpen({ page = 1, ...filter }: SearchFilter): Promise<OpenPostingsPage> {
    const { rows, total } = await this.repo.listOpen(
      { ...filter, q: blankToUndefined(filter.q), location: blankToUndefined(filter.location), skill: blankToUndefined(filter.skill) },
      { offset: (page - 1) * PAGE_SIZE, limit: PAGE_SIZE },
    );
    return { items: rows.map(toSummary), total, page, pageSize: PAGE_SIZE };
  }

  /** Up to RELATED_LIMIT open postings in the same industry, newest first; [] for DRAFT or unknown ids. */
  async listRelated(id: JobPostingId): Promise<PostingSummary[]> {
    const posting = await this.repo.findById(id);
    if (!posting || posting.status === 'DRAFT') return [];
    const { rows } = await this.repo.listOpen({ industry: posting.industry }, { offset: 0, limit: RELATED_LIMIT + 1 });
    return rows.filter((r) => r.id !== id).slice(0, RELATED_LIMIT).map(toSummary);
  }

  /** Open postings of one Employer for their company page, newest first. */
  async listOpenByEmployer(employerId: EmployerId): Promise<PostingSummary[]> {
    const { rows } = await this.repo.listOpen({ employerId }, { offset: 0, limit: COMPANY_POSTINGS_LIMIT });
    return rows.map(toSummary);
  }

  /** Public detail: CLOSED/EXPIRED still readable (isOpen = false); DRAFT looks missing. */
  async getPublic(id: JobPostingId): Promise<PostingDetail | null> {
    const posting = await this.repo.findById(id);
    if (!posting || posting.status === 'DRAFT') return null;
    return { ...this.view(posting), isOpen: isOpen(posting.status, posting.applicationDeadline, this.now()) };
  }

  /** See IJobPostingRepository.recordView: the database decides whether the view counts. */
  recordView(id: JobPostingId): Promise<void> {
    return this.repo.recordView(id);
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

export function toSummary(p: StoredJobPosting): PostingSummary {
  const { id, title, companyName, companyLogoUrl, location, employmentType, salaryMin, salaryMax, applicationDeadline, createdAt } = p;
  const { industry, level, experienceYears, skills, employerId } = p;
  return {
    id, title, companyName, companyLogoUrl, location, employmentType, salaryMin, salaryMax, applicationDeadline, createdAt,
    industry, level, experienceYears, skills, employerId,
  };
}

function blankToUndefined(text: string | undefined) {
  return text?.trim() || undefined;
}
