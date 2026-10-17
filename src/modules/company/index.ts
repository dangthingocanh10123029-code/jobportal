import type { CompaniesPage } from '@/modules/shared/types';
import type { Company, CompanyChanges, CompanyId, ICompanyRepository } from './domain/types';

export type * from './domain/types';

export const COMPANY_PAGE_SIZE = 20;

/** Company profiles: the owning Employer edits, everyone reads. */
export class CompanyService {
  constructor(private readonly repo: ICompanyRepository) {}

  get(id: CompanyId): Promise<Company | null> {
    return this.repo.findById(id);
  }

  update(id: CompanyId, changes: CompanyChanges): Promise<Company | null> {
    return this.repo.update(id, changes);
  }

  /** `page` starts at 1; a blank q lists every Company. */
  async list({ q, page = 1 }: { q?: string; page?: number }): Promise<CompaniesPage> {
    const { rows, total } = await this.repo.list(q?.trim() || undefined, {
      offset: (page - 1) * COMPANY_PAGE_SIZE,
      limit: COMPANY_PAGE_SIZE,
    });
    return { items: rows, total, page, pageSize: COMPANY_PAGE_SIZE };
  }
}
