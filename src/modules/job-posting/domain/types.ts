import type { DisplayPostingStatus, PostingInput, PostingStatus } from '@/actions/types';
import type { SearchCriteria } from './search';

export type { PostingInput, SearchCriteria };

export type JobPostingId = string & { readonly __brand: 'JobPostingId' };
export type EmployerId = string & { readonly __brand: 'EmployerId' };

/** As stored: EXPIRED is never stored (ADR-0001). */
export type StoredJobPosting = PostingInput & {
  id: JobPostingId;
  employerId: EmployerId;
  companyName: string;
  companyLogoUrl: string | null;
  status: PostingStatus;
  createdAt: string;
  updatedAt: string;
};

export type JobPosting = StoredJobPosting & { displayStatus: DisplayPostingStatus };

export interface IJobPostingRepository {
  insert(employerId: EmployerId, input: PostingInput): Promise<StoredJobPosting>;
  findById(id: JobPostingId): Promise<StoredJobPosting | null>;
  update(id: JobPostingId, changes: Partial<PostingInput> & { status?: PostingStatus }): Promise<StoredJobPosting>;
  /** Newest first. */
  listByEmployer(employerId: EmployerId): Promise<StoredJobPosting[]>;
  /** Open postings (see isOpen) matching every given criterion, ordered by criteria.sort (default newest; ties newest first), sliced to the range; total counts all matches. */
  listOpen(
    criteria: SearchCriteria,
    range: { offset: number; limit: number },
  ): Promise<{ rows: StoredJobPosting[]; total: number }>;
  /** Counts one view of a PUBLISHED/CLOSED posting by anyone but its Employer; a no-op otherwise. */
  recordView(id: JobPostingId): Promise<void>;
}

export type Clock = () => Date;
