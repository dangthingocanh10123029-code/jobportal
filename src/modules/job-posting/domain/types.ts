import type { DisplayPostingStatus, PostingInput, PostingStatus } from '@/actions/types';

export type { PostingInput };

export type JobPostingId = string & { readonly __brand: 'JobPostingId' };
export type EmployerId = string & { readonly __brand: 'EmployerId' };

/** As stored: EXPIRED is never stored (ADR-0001). */
export type StoredJobPosting = PostingInput & {
  id: JobPostingId;
  employerId: EmployerId;
  companyName: string;
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
}

export type Clock = () => Date;
