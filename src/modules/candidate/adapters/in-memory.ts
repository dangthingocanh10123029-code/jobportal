import { toSummary, type Clock, type IJobPostingRepository, type JobPostingId, type EmployerId } from '@/modules/job-posting';
import type { ApplicationId } from '@/modules/application';
import type { CandidateId, CandidateProfile, CandidateProfileChanges, ICandidateRepository, SavedPostingRow } from '../domain/types';

/** Mimics the profiles column grants, employer_application_summaries and the saved_postings RLS. */
export class InMemoryCandidateRepository implements ICandidateRepository {
  private readonly profiles: Map<string, CandidateProfile>;
  private readonly applications: { id: string; candidateId: string; jobPostingId: string }[] = [];
  // Insertion order = save order; the key is the (candidate, posting) primary key.
  private readonly saved = new Map<string, { candidateId: string; postingId: JobPostingId; savedAt: string }>();

  constructor(
    private readonly postings: IJobPostingRepository,
    profiles: CandidateProfile[] = [],
    private readonly now: Clock = () => new Date(),
  ) {
    this.profiles = new Map(profiles.map((p) => [p.userId, { ...p }]));
  }

  addApplication(application: { id: string; candidateId: string; jobPostingId: string }) {
    this.applications.push(application);
  }

  async findProfile(id: CandidateId) {
    const profile = this.profiles.get(id);
    return profile ? { ...profile } : null;
  }

  async updateProfile(id: CandidateId, changes: CandidateProfileChanges) {
    const profile = this.profiles.get(id);
    if (!profile) return null;
    const defined = Object.fromEntries(Object.entries(changes).filter(([, v]) => v !== undefined));
    this.profiles.set(id, { ...profile, ...defined });
    return this.findProfile(id);
  }

  async findApplicantProfile(employerId: EmployerId, applicationId: ApplicationId) {
    const application = this.applications.find((a) => a.id === applicationId);
    const posting = application && (await this.postings.findById(application.jobPostingId as JobPostingId));
    return application && posting?.employerId === employerId ? this.findProfile(application.candidateId as CandidateId) : null;
  }

  async removeSaved(candidateId: CandidateId, postingId: JobPostingId) {
    return this.saved.delete(key(candidateId, postingId));
  }

  async addSaved(candidateId: CandidateId, postingId: JobPostingId) {
    const posting = await this.postings.findById(postingId);
    if (!posting || posting.status === 'DRAFT') return false;
    // After the await, like ON CONFLICT DO NOTHING.
    if (!this.saved.has(key(candidateId, postingId))) {
      this.saved.set(key(candidateId, postingId), { candidateId, postingId, savedAt: this.now().toISOString() });
    }
    return true;
  }

  async listSaved(candidateId: CandidateId) {
    const rows: SavedPostingRow[] = [];
    for (const s of this.mine(candidateId)) {
      const posting = await this.postings.findById(s.postingId);
      if (posting) rows.push({ ...toSummary(posting), status: posting.status, savedAt: s.savedAt });
    }
    return rows;
  }

  async listSavedIds(candidateId: CandidateId) {
    return this.mine(candidateId).map((s) => s.postingId);
  }

  private mine(candidateId: CandidateId) {
    return [...this.saved.values()]
      .filter((s) => s.candidateId === candidateId)
      .sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  }
}

const key = (candidateId: string, postingId: string) => `${candidateId}:${postingId}`;
