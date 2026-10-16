import type { Application, StatusChange } from '@/actions/types';
import type { JobPostingId } from '@/modules/job-posting';

export type { Application, StatusChange };

export type ApplicationId = string & { readonly __brand: 'ApplicationId' };
export type CandidateId = string & { readonly __brand: 'CandidateId' };

export interface IApplicationRepository {
  /**
   * Atomically: refuses with ApplicationError POSTING_NOT_OPEN unless the posting is open (DB clock),
   * ALREADY_APPLIED if this Candidate already applied (ADR-0002); otherwise writes the SUBMITTED
   * Application and its first Status Change together.
   */
  submit(candidateId: CandidateId, jobPostingId: JobPostingId, resumePath: string): Promise<Application>;
  findByPosting(candidateId: CandidateId, jobPostingId: JobPostingId): Promise<Application | null>;
  findById(id: ApplicationId): Promise<Application | null>;
  /** Oldest first. */
  listStatusChanges(id: ApplicationId): Promise<StatusChange[]>;
}
