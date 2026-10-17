import type { SupabaseClient } from '@supabase/supabase-js';
import type { CompanySize } from '@/modules/shared/types';
import { foldAccents } from '@/modules/job-posting/domain/search';
import type { Company, CompanyChanges, CompanyId, ICompanyRepository } from '../domain/types';

type Row = {
  id: string;
  name: string;
  logo_url: string | null;
  about: string | null;
  size: CompanySize | null;
  address: string | null;
  website: string | null;
};

const COLUMNS = 'id,name,logo_url,about,size,address,website';

// PostgREST: offset beyond the last row.
const RANGE_NOT_SATISFIABLE = 'PGRST103';

// The user's text is literal in LIKE patterns.
const escapeLike = (text: string) => text.replace(/[\\%_]/g, '\\$&');

function toCompany(row: Row): Company {
  return {
    id: row.id,
    name: row.name,
    logoUrl: row.logo_url,
    about: row.about,
    size: row.size,
    address: row.address,
    website: row.website,
  };
}

function toColumns(changes: CompanyChanges) {
  const columns = {
    name: changes.name,
    logo_url: changes.logoUrl,
    about: changes.about,
    size: changes.size,
    address: changes.address,
    website: changes.website,
  };
  // Drop undefined so a partial update only touches the given columns.
  return Object.fromEntries(Object.entries(columns).filter(([, v]) => v !== undefined));
}

/** Runs as the signed-in user (or anon): RLS lets everyone read and only the owner update. */
export class SupabaseCompanyRepository implements ICompanyRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findById(id: CompanyId) {
    const { data, error } = await this.supabase.from('companies').select(COLUMNS).eq('id', id).maybeSingle<Row>();
    if (error) throw new Error(`Không đọc được công ty: ${error.message}`);
    return data ? toCompany(data) : null;
  }

  async update(id: CompanyId, changes: CompanyChanges) {
    const { data, error } = await this.supabase
      .from('companies')
      .update(toColumns(changes))
      .eq('id', id)
      .select(COLUMNS)
      .maybeSingle<Row>();
    if (error) throw new Error(`Không cập nhật được công ty: ${error.message}`);
    return data ? toCompany(data) : null;
  }

  async list(q: string | undefined, { offset, limit }: { offset: number; limit: number }) {
    const matching = (options: { count: 'exact'; head?: boolean }) => {
      const query = this.supabase.from('company_summaries').select(`${COLUMNS},open_postings`, options);
      return q === undefined ? query : query.ilike('search_name', `%${escapeLike(foldAccents(q))}%`);
    };
    const { data, error, count } = await matching({ count: 'exact' })
      .order('open_postings', { ascending: false })
      .order('name')
      .order('id')
      .range(offset, offset + limit - 1)
      .returns<(Row & { open_postings: number })[]>();
    if (error?.code === RANGE_NOT_SATISFIABLE) {
      // A page past the end: PostgREST answers 416 without a count, so count separately.
      const head = await matching({ count: 'exact', head: true });
      if (head.error) throw new Error(`Không đọc được danh sách công ty: ${head.error.message}`);
      return { rows: [], total: head.count ?? 0 };
    }
    if (error) throw new Error(`Không đọc được danh sách công ty: ${error.message}`);
    return { rows: data.map((row) => ({ ...toCompany(row), openPostings: row.open_postings })), total: count ?? 0 };
  }
}
