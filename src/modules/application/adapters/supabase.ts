import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import type { ApplicationStatus, Role } from '@/actions/types';
import type { JobPostingId } from '@/modules/job-posting';
import { ApplicationError, isApplicationErrorCode } from '../domain/errors';
import type { Application, ApplicationId, CandidateId, IApplicationRepository, StatusChange } from '../domain/types';

type Row = {
  id: string;
  job_posting_id: string;
  candidate_id: string;
  status: ApplicationStatus;
  created_at: string;
  updated_at: string;
};

type ChangeRow = { from_status: ApplicationStatus | null; to_status: ApplicationStatus; changed_by_role: Role; changed_at: string };

const COLUMNS = 'id,job_posting_id,candidate_id,status,created_at,updated_at';

function toApplication(row: Row): Application {
  return {
    id: row.id,
    jobPostingId: row.job_posting_id,
    candidateId: row.candidate_id,
    status: row.status,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

/** RPC errors whose message is an ApplicationErrorCode are business-rule refusals, not system failures. */
function rpcError(error: PostgrestError): Error {
  return isApplicationErrorCode(error.message)
    ? new ApplicationError(error.message)
    : new Error(`Không nộp được hồ sơ: ${error.message}`);
}

/** Runs as the signed-in user: RLS limits reads, and writes go only through RPCs that use auth.uid() as the actor. */
export class SupabaseApplicationRepository implements IApplicationRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  /** `candidateId` is not sent: submit_application takes the Candidate from the session (auth.uid()). */
  async submit(_candidateId: CandidateId, jobPostingId: JobPostingId, resumePath: string) {
    const { data, error } = await this.supabase
      .rpc('submit_application', { p_job_posting_id: jobPostingId, p_resume_path: resumePath })
      .single<Row>();
    if (error) throw rpcError(error);
    return toApplication(data);
  }

  async findByPosting(candidateId: CandidateId, jobPostingId: JobPostingId) {
    const { data, error } = await this.supabase
      .from('applications')
      .select(COLUMNS)
      .eq('candidate_id', candidateId)
      .eq('job_posting_id', jobPostingId)
      .maybeSingle<Row>();
    if (error) throw new Error(`Không đọc được hồ sơ: ${error.message}`);
    return data ? toApplication(data) : null;
  }

  async findById(id: ApplicationId) {
    const { data, error } = await this.supabase.from('applications').select(COLUMNS).eq('id', id).maybeSingle<Row>();
    if (error) throw new Error(`Không đọc được hồ sơ: ${error.message}`);
    return data ? toApplication(data) : null;
  }

  async listStatusChanges(id: ApplicationId) {
    const { data, error } = await this.supabase
      .from('application_status_changes')
      .select('from_status,to_status,changed_by_role,changed_at')
      .eq('application_id', id)
      .order('changed_at')
      .order('id')
      .returns<ChangeRow[]>();
    if (error) throw new Error(`Không đọc được lịch sử hồ sơ: ${error.message}`);
    return data.map(
      (c): StatusChange => ({
        fromStatus: c.from_status,
        toStatus: c.to_status,
        changedByRole: c.changed_by_role,
        changedAt: new Date(c.changed_at).toISOString(),
      }),
    );
  }
}
