import type { SupabaseClient } from '@supabase/supabase-js';
import type { EmploymentType, PostingStatus } from '@/actions/types';
import { foldAccents } from '../domain/search';
import type {
  EmployerId,
  IJobPostingRepository,
  JobPostingId,
  PostingInput,
  SearchCriteria,
  StoredJobPosting,
} from '../domain/types';

type Row = {
  id: string;
  employer_id: string;
  company_name: string;
  title: string;
  description: string;
  location: string;
  employment_type: EmploymentType;
  salary_min: number | null;
  salary_max: number | null;
  application_deadline: string;
  status: PostingStatus;
  created_at: string;
  updated_at: string;
};

const VIEW = 'job_postings_with_company';
// Explicit list: open_job_postings also carries the folded search columns, which are not needed back.
const ROW_COLUMNS =
  'id,employer_id,company_name,title,description,location,employment_type,salary_min,salary_max,application_deadline,status,created_at,updated_at';

// The user's text is literal in LIKE patterns.
// ponytail: PostgREST still turns '*' into '%', so '*' in a keyword acts as a wildcard; harmless for search.
const escapeLike = (text: string) => text.replace(/[\\%_]/g, '\\$&');

function toPosting(row: Row): StoredJobPosting {
  return {
    id: row.id as JobPostingId,
    employerId: row.employer_id as EmployerId,
    companyName: row.company_name,
    title: row.title,
    description: row.description,
    location: row.location,
    employmentType: row.employment_type,
    salaryMin: row.salary_min,
    salaryMax: row.salary_max,
    applicationDeadline: new Date(row.application_deadline).toISOString(),
    status: row.status,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

function toColumns(input: Partial<PostingInput> & { status?: PostingStatus }) {
  const columns = {
    title: input.title,
    description: input.description,
    location: input.location,
    employment_type: input.employmentType,
    salary_min: input.salaryMin,
    salary_max: input.salaryMax,
    application_deadline: input.applicationDeadline,
    status: input.status,
  };
  // Drop undefined so a partial update only touches the given columns.
  return Object.fromEntries(Object.entries(columns).filter(([, v]) => v !== undefined));
}

/** Runs as the signed-in user: RLS on job_postings enforces ownership and DRAFT privacy. */
export class SupabaseJobPostingRepository implements IJobPostingRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async insert(employerId: EmployerId, input: PostingInput) {
    const { data, error } = await this.supabase
      .from('job_postings')
      .insert({ ...toColumns(input), employer_id: employerId })
      .select('id')
      .single();
    if (error) throw new Error(`Không tạo được tin: ${error.message}`);
    return this.mustFind(data.id as JobPostingId);
  }

  async findById(id: JobPostingId) {
    const { data, error } = await this.supabase.from(VIEW).select('*').eq('id', id).maybeSingle<Row>();
    if (error) throw new Error(`Không đọc được tin: ${error.message}`);
    return data ? toPosting(data) : null;
  }

  async update(...[id, changes]: Parameters<IJobPostingRepository['update']>) {
    const { error } = await this.supabase.from('job_postings').update(toColumns(changes)).eq('id', id);
    if (error) throw new Error(`Không cập nhật được tin: ${error.message}`);
    return this.mustFind(id);
  }

  async listByEmployer(employerId: EmployerId) {
    const { data, error } = await this.supabase
      .from(VIEW)
      .select('*')
      .eq('employer_id', employerId)
      .order('created_at', { ascending: false })
      .returns<Row[]>();
    if (error) throw new Error(`Không đọc được danh sách tin: ${error.message}`);
    return data.map(toPosting);
  }

  async listOpen(
    { q, location, employmentType, minSalary }: SearchCriteria,
    { offset, limit }: { offset: number; limit: number },
  ) {
    let query = this.supabase.from('open_job_postings').select(ROW_COLUMNS, { count: 'exact' });
    if (q !== undefined) query = query.ilike('search_text', `%${escapeLike(foldAccents(q))}%`);
    if (location !== undefined) query = query.ilike('search_location', escapeLike(foldAccents(location)));
    if (employmentType !== undefined) query = query.eq('employment_type', employmentType);
    // salary_max null = negotiable / no upper bound: always matches. minSalary is a validated integer.
    if (minSalary !== undefined) query = query.or(`salary_max.is.null,salary_max.gte.${minSalary}`);
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .order('id') // stable order across pages when created_at ties
      .range(offset, offset + limit - 1)
      .returns<Row[]>();
    if (error) throw new Error(`Không đọc được danh sách tin: ${error.message}`);
    return { rows: data.map(toPosting), total: count ?? 0 };
  }

  private async mustFind(id: JobPostingId) {
    const posting = await this.findById(id);
    if (!posting) throw new Error(`Không đọc lại được tin ${id}`);
    return posting;
  }
}
