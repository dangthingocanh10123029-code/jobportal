import type { SupabaseClient } from '@supabase/supabase-js';
import type { EmploymentType, Industry, JobLevel, PostingSort, PostingStatus } from '@/actions/types';
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
  industry: Industry;
  level: JobLevel;
  experience_years: number;
  headcount: number;
  skills: string[];
  requirements: string;
  benefits: string;
  company_logo_url: string | null;
};

const VIEW = 'job_postings_with_company';
// Explicit list: open_job_postings also carries the folded search columns, which are not needed back.
const ROW_COLUMNS =
  'id,employer_id,company_name,title,description,location,employment_type,salary_min,salary_max,application_deadline,status,created_at,updated_at,' +
  'industry,level,experience_years,headcount,skills,requirements,benefits,company_logo_url';

// PostgREST: offset beyond the last row.
const RANGE_NOT_SATISFIABLE = 'PGRST103';

// The user's text is literal in LIKE patterns.
// ponytail: PostgREST still turns '*' into '%', so '*' in a keyword acts as a wildcard; harmless for search.
const escapeLike = (text: string) => text.replace(/[\\%_]/g, '\\$&');

// One-element Postgres array literal; quoting keeps commas and braces in a skill literal.
const arrayOf = (text: string) => `{"${text.replace(/["\\]/g, '\\$&')}"}`;

// Ties: newest first, then id, so pages stay stable. Mirrored by SORTS in the InMemory adapter.
const ORDER: Record<PostingSort, [column: string, ascending: boolean][]> = {
  newest: [],
  salary_desc: [['salary_max', false]],
  deadline_asc: [['application_deadline', true]],
};

function toPosting(row: Row): StoredJobPosting {
  return {
    id: row.id as JobPostingId,
    employerId: row.employer_id as EmployerId,
    companyName: row.company_name,
    companyLogoUrl: row.company_logo_url,
    title: row.title,
    description: row.description,
    location: row.location,
    employmentType: row.employment_type,
    salaryMin: row.salary_min,
    salaryMax: row.salary_max,
    applicationDeadline: new Date(row.application_deadline).toISOString(),
    industry: row.industry,
    level: row.level,
    experienceYears: row.experience_years,
    headcount: row.headcount,
    skills: row.skills,
    requirements: row.requirements,
    benefits: row.benefits,
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
    industry: input.industry,
    level: input.level,
    experience_years: input.experienceYears,
    headcount: input.headcount,
    skills: input.skills,
    requirements: input.requirements,
    benefits: input.benefits,
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
    { q, location, employmentType, minSalary, industry, level, maxExperience, skill, employerId, sort = 'newest' }: SearchCriteria,
    { offset, limit }: { offset: number; limit: number },
  ) {
    const matching = (options: { count: 'exact'; head?: boolean }) => {
      let query = this.supabase.from('open_job_postings').select(ROW_COLUMNS, options);
      if (q !== undefined) query = query.ilike('search_text', `%${escapeLike(foldAccents(q))}%`);
      if (location !== undefined) query = query.ilike('search_location', `%${escapeLike(foldAccents(location))}%`);
      if (employmentType !== undefined) query = query.eq('employment_type', employmentType);
      // salary_max null = negotiable / no upper bound: always matches. minSalary is a validated integer.
      if (minSalary !== undefined) query = query.or(`salary_max.is.null,salary_max.gte.${minSalary}`);
      if (industry !== undefined) query = query.eq('industry', industry);
      if (level !== undefined) query = query.eq('level', level);
      if (maxExperience !== undefined) query = query.lte('experience_years', maxExperience);
      if (employerId !== undefined) query = query.eq('employer_id', employerId);
      if (skill !== undefined) query = query.filter('search_skills', 'cs', arrayOf(foldAccents(skill)));
      return query;
    };
    let ordered = matching({ count: 'exact' });
    for (const [column, ascending] of ORDER[sort]) ordered = ordered.order(column, { ascending, nullsFirst: false });
    const { data, error, count } = await ordered
      .order('created_at', { ascending: false })
      .order('id') // stable order across pages when created_at ties
      .range(offset, offset + limit - 1)
      .returns<Row[]>();
    if (error?.code === RANGE_NOT_SATISFIABLE) {
      // A page past the end: PostgREST answers 416 without a count, so count separately.
      const head = await matching({ count: 'exact', head: true });
      if (head.error) throw new Error(`Không đọc được danh sách tin: ${head.error.message}`);
      return { rows: [], total: head.count ?? 0 };
    }
    if (error) throw new Error(`Không đọc được danh sách tin: ${error.message}`);
    return { rows: data.map(toPosting), total: count ?? 0 };
  }

  private async mustFind(id: JobPostingId) {
    const posting = await this.findById(id);
    if (!posting) throw new Error(`Không đọc lại được tin ${id}`);
    return posting;
  }
}
