import type { CandidateProfile, PostingStatus, PostingSummary, SavedPostingSummary } from '@/actions/types';
import type { CandidateId } from '@/modules/application';
import type { EmployerId, JobPostingId } from '@/modules/job-posting';

export type { CandidateId, CandidateProfile, SavedPostingSummary };

/** null clears a field; undefined leaves it as is. */
export type CandidateProfileChanges = {
  headline?: string | null;
  skills?: string[];
  experience?: string | null;
  education?: string | null;
};

export type SavedPostingRow = PostingSummary & { status: PostingStatus; savedAt: string };

export interface ICandidateRepository {
  findProfile(id: CandidateId): Promise<CandidateProfile | null>;
  /** null when the Candidate does not exist (or is not the caller, under RLS). */
  updateProfile(id: CandidateId, changes: CandidateProfileChanges): Promise<CandidateProfile | null>;
  /** null unless the Application is on a posting `employerId` owns. */
  findApplicantProfile(employerId: EmployerId, applicationId: string): Promise<CandidateProfile | null>;
  /** true when a saved row was removed. */
  removeSaved(candidateId: CandidateId, postingId: JobPostingId): Promise<boolean>;
  /** No-op when already saved; false unless the posting exists and is PUBLISHED or CLOSED. */
  addSaved(candidateId: CandidateId, postingId: JobPostingId): Promise<boolean>;
  /** Most recently saved first. */
  listSaved(candidateId: CandidateId): Promise<SavedPostingRow[]>;
  listSavedIds(candidateId: CandidateId): Promise<string[]>;
}
