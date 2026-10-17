import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApplicationStatus, PostingStatus } from '@/actions/types';
import type { EmployerId, IDashboardRepository, PostingStats } from '../domain/types';

type Row = {
  id: string;
  title: string;
  status: PostingStatus;
  application_deadline: string;
  views: number;
  applications_by_status: Partial<Record<ApplicationStatus, number>>;
};

/** One query on employer_posting_stats (RLS + the view's own filter: the signed-in Employer's postings only). */
export class SupabaseDashboardRepository implements IDashboardRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async listPostingStats(employerId: EmployerId): Promise<PostingStats[]> {
    const { data, error } = await this.supabase
      .from('employer_posting_stats')
      .select('id,title,status,application_deadline,views,applications_by_status')
      .eq('employer_id', employerId)
      .order('created_at', { ascending: false })
      .returns<Row[]>();
    if (error) throw new Error(`Không đọc được số liệu dashboard: ${error.message}`);
    return data.map((row) => ({
      id: row.id,
      title: row.title,
      status: row.status,
      applicationDeadline: new Date(row.application_deadline).toISOString(),
      views: row.views,
      applicationsByStatus: row.applications_by_status,
    }));
  }
}
