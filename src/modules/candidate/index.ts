import { isOpen } from '@/modules/job-posting/domain/status';
import type { Clock, EmployerId, JobPostingId } from '@/modules/job-posting';
import type { ApplicationId } from '@/modules/application';
import type {
  CandidateId,
  CandidateProfile,
  CandidateProfileChanges,
  ICandidateRepository,
  SavedPostingSummary,
} from './domain/types';

export type * from './domain/types';

/** Candidate profile (owner edits, Employer reads through an Application) and saved postings. */
export class CandidateService {
  constructor(
    private readonly repo: ICandidateRepository,
    private readonly now: Clock = () => new Date(),
  ) {}

  getProfile(id: CandidateId): Promise<CandidateProfile | null> {
    return this.repo.findProfile(id);
  }

  updateProfile(id: CandidateId, changes: CandidateProfileChanges): Promise<CandidateProfile | null> {
    return this.repo.updateProfile(id, changes);
  }

  getApplicantProfile(employerId: EmployerId, applicationId: ApplicationId): Promise<CandidateProfile | null> {
    return this.repo.findApplicantProfile(employerId, applicationId);
  }

  /** Saved → unsaved, otherwise saved. null when the posting cannot be saved (missing or DRAFT). */
  async toggleSaved(candidateId: CandidateId, postingId: JobPostingId): Promise<{ saved: boolean } | null> {
    if (await this.repo.removeSaved(candidateId, postingId)) return { saved: false };
    return (await this.repo.addSaved(candidateId, postingId)) ? { saved: true } : null;
  }

  async listSaved(candidateId: CandidateId): Promise<SavedPostingSummary[]> {
    return (await this.repo.listSaved(candidateId)).map(({ status, ...p }) => ({
      ...p,
      isOpen: isOpen(status, p.applicationDeadline, this.now()),
    }));
  }

  listSavedIds(candidateId: CandidateId): Promise<JobPostingId[]> {
    return this.repo.listSavedIds(candidateId);
  }
}
