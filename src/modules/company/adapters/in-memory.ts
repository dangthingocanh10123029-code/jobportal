import { foldAccents } from '@/modules/job-posting/domain/search';
import type { CompanyChanges, CompanyId, CompanySummary, ICompanyRepository } from '../domain/types';

export class InMemoryCompanyRepository implements ICompanyRepository {
  private readonly rows: Map<string, CompanySummary>;

  constructor(rows: CompanySummary[] = []) {
    this.rows = new Map(rows.map((r) => [r.id, { ...r }]));
  }

  async findById(id: CompanyId) {
    const row = this.rows.get(id);
    if (!row) return null;
    const { openPostings: _, ...company } = row;
    return company;
  }

  async update(id: CompanyId, changes: CompanyChanges) {
    const row = this.rows.get(id);
    if (!row) return null;
    const defined = Object.fromEntries(Object.entries(changes).filter(([, v]) => v !== undefined));
    this.rows.set(id, { ...row, ...defined });
    return this.findById(id);
  }

  async list(q: string | undefined, { offset, limit }: { offset: number; limit: number }) {
    // Mirrors the ORDER BY in SupabaseCompanyRepository.list.
    const matching = [...this.rows.values()]
      .filter((r) => q === undefined || foldAccents(r.name).includes(foldAccents(q)))
      .sort((a, b) => b.openPostings - a.openPostings || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
    return { rows: matching.slice(offset, offset + limit).map((r) => ({ ...r })), total: matching.length };
  }
}
