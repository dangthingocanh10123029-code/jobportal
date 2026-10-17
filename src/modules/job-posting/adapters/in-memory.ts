import type { PostingSort } from '@/actions/types';
import { foldAccents, meetsMinSalary } from '../domain/search';
import { isOpen } from '../domain/status';
import type { Clock, EmployerId, IJobPostingRepository, JobPostingId, SearchCriteria, StoredJobPosting } from '../domain/types';

export class InMemoryJobPostingRepository implements IJobPostingRepository {
  private readonly rows = new Map<JobPostingId, StoredJobPosting>();
  private nextId = 1;

  constructor(
    private readonly companyNames: Record<string, string> = {},
    private readonly now: Clock = () => new Date(),
  ) {}

  async insert(...[employerId, input]: Parameters<IJobPostingRepository['insert']>) {
    const at = new Date().toISOString();
    const row: StoredJobPosting = {
      ...input,
      id: `posting-${this.nextId++}` as JobPostingId,
      employerId,
      companyName: this.companyNames[employerId] ?? '',
      companyLogoUrl: null,
      status: 'DRAFT',
      createdAt: at,
      updatedAt: at,
    };
    this.rows.set(row.id, row);
    return { ...row };
  }

  async findById(id: JobPostingId) {
    const row = this.rows.get(id);
    return row ? { ...row } : null;
  }

  async update(...[id, changes]: Parameters<IJobPostingRepository['update']>) {
    const row = this.rows.get(id);
    if (!row) throw new Error(`Posting ${id} not found`);
    const updated = { ...row, ...changes, updatedAt: new Date().toISOString() };
    this.rows.set(id, updated);
    return { ...updated };
  }

  async listByEmployer(employerId: EmployerId) {
    // Insertion order stands in for created_at.
    return [...this.rows.values()].filter((r) => r.employerId === employerId).reverse().map((r) => ({ ...r }));
  }

  async listOpen(
    { q, location, employmentType, minSalary, industry, level, maxExperience, skill, employerId, sort = 'newest' }: SearchCriteria,
    { offset, limit }: { offset: number; limit: number },
  ) {
    const open = [...this.rows.values()]
      .filter((r) => isOpen(r.status, r.applicationDeadline, this.now()))
      .filter((r) => q === undefined || foldAccents(`${r.title} ${r.description}`).includes(foldAccents(q)))
      .filter((r) => location === undefined || foldAccents(r.location).includes(foldAccents(location)))
      .filter((r) => employmentType === undefined || r.employmentType === employmentType)
      .filter((r) => minSalary === undefined || meetsMinSalary(r.salaryMax, minSalary))
      .filter((r) => industry === undefined || r.industry === industry)
      .filter((r) => level === undefined || r.level === level)
      .filter((r) => maxExperience === undefined || r.experienceYears <= maxExperience)
      .filter((r) => employerId === undefined || r.employerId === employerId)
      .filter((r) => skill === undefined || r.skills.some((s) => foldAccents(s) === foldAccents(skill)))
      .reverse() // newest first; the stable sort below keeps that as the tie-break
      .sort(SORTS[sort]);
    return { rows: open.slice(offset, offset + limit).map((r) => ({ ...r })), total: open.length };
  }
}

// Mirrors the ORDER BY in SupabaseJobPostingRepository.listOpen.
const SORTS: Record<PostingSort, (a: StoredJobPosting, b: StoredJobPosting) => number> = {
  newest: () => 0,
  salary_desc: (a, b) => (b.salaryMax ?? -1) - (a.salaryMax ?? -1),
  deadline_asc: (a, b) => Date.parse(a.applicationDeadline) - Date.parse(b.applicationDeadline),
};
