import type { Company, CompanySize, CompanySummary } from '@/actions/types';

export type { Company, CompanySummary };

/** = the Employer's user id. */
export type CompanyId = string & { readonly __brand: 'CompanyId' };

/** null clears a field; undefined leaves it as is. */
export type CompanyChanges = {
  name?: string;
  logoUrl?: string | null;
  about?: string | null;
  size?: CompanySize | null;
  address?: string | null;
  website?: string | null;
};

export interface ICompanyRepository {
  findById(id: CompanyId): Promise<Company | null>;
  /** null when the Company does not exist (or is not the caller's, under RLS). */
  update(id: CompanyId, changes: CompanyChanges): Promise<Company | null>;
  /** Name contains q (accent- and case-insensitive); most open postings first, then name, then id. */
  list(q: string | undefined, range: { offset: number; limit: number }): Promise<{ rows: CompanySummary[]; total: number }>;
}
