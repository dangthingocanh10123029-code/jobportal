import type { JobPostingId } from '@/modules/job-posting';
import type {
  Application,
  ApplicationId,
  CandidateApplicationSummary,
  CandidateId,
  IApplicationRepository,
  StatusChange,
} from './domain/types';

export { ApplicationError, type ApplicationErrorCode } from './domain/errors';
export type * from './domain/types';
export { allowedNextStatuses, TRANSITIONS } from './domain/status';

/** Applications and the Application Status state machine. */
export class ApplicationService {
  constructor(private readonly repo: IApplicationRepository) {}

  /** Candidate applies once per open posting with a Resume already uploaded to `resumePath`. */
  async submit(candidateId: CandidateId, jobPostingId: JobPostingId, resumePath: string): Promise<Application> {
    return this.repo.submit(candidateId, jobPostingId, resumePath);
  }

  /** The Candidate's Application to this posting, if any. */
  async getMine(candidateId: CandidateId, jobPostingId: JobPostingId): Promise<Application | null> {
    return this.repo.findByPosting(candidateId, jobPostingId);
  }

  /** Status Change history of the Candidate's own Application, oldest first; null if not theirs. */
  async getHistory(candidateId: CandidateId, id: ApplicationId): Promise<StatusChange[] | null> {
    const application = await this.repo.findById(id);
    return application?.candidateId === candidateId ? this.repo.listStatusChanges(id) : null;
  }

  /** The Candidate's Applications, newest first. */
  async listMine(candidateId: CandidateId): Promise<CandidateApplicationSummary[]> {
    return this.repo.listByCandidate(candidateId);
  }

  /** One of the Candidate's own Applications with its history; null if not theirs. */
  async getMineWithHistory(
    candidateId: CandidateId,
    id: ApplicationId,
  ): Promise<(CandidateApplicationSummary & { history: StatusChange[] }) | null> {
    // ponytail: scans the Candidate's list (tens of rows); add a findSummary query if that grows.
    const summary = (await this.repo.listByCandidate(candidateId)).find((a) => a.id === id);
    return summary ? { ...summary, history: await this.repo.listStatusChanges(id) } : null;
  }

  /** Candidate moves their own Application to WITHDRAWN, the only transition a Candidate may make. */
  async withdraw(candidateId: CandidateId, id: ApplicationId): Promise<Application> {
    return this.repo.changeStatus(id, 'WITHDRAWN', { userId: candidateId, role: 'CANDIDATE' });
  }
}
