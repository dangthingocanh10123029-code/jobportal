import type { Actor, Application, ApplicationStatus, CandidateApplicationSummary, StatusChange } from '@/actions/types';
import type { JobPostingId } from '@/modules/job-posting';

export type { Application, CandidateApplicationSummary, StatusChange };

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
  /** Newest first, with the posting's title and company. */
  listByCandidate(candidateId: CandidateId): Promise<CandidateApplicationSummary[]>;
  /**
   * Atomically, with the Application locked: APPLICATION_NOT_FOUND unless `actor` is its Candidate or the
   * Employer owning its posting; INVALID_TRANSITION unless allowedNextStatuses(status, role) has `toStatus`;
   * otherwise updates the status and writes the Status Change together.
   */
  changeStatus(id: ApplicationId, toStatus: ApplicationStatus, actor: Actor): Promise<Application>;
}
