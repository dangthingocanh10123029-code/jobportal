import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApplicationId } from '@/modules/application';
import type { EmployerId, JobPostingId } from '@/modules/job-posting';
import { SUMMARY_COLUMNS, toPostingSummary, type PostingSummaryRow } from '@/modules/job-posting/adapters/supabase';
import type { PostingStatus } from '@/modules/shared/types';
import type { CandidateId, CandidateProfile, CandidateProfileChanges, ICandidateRepository, SavedPostingRow } from '../domain/types';

type ProfileRow = {
  id: string;
  full_name: string;
  phone: string | null;
  headline: string | null;
  skills: string[];
  experience: string | null;
  education: string | null;
};

type ApplicantRow = {
  candidate_id: string;
  candidate_name: string;
  candidate_phone: string | null;
  candidate_headline: string | null;
  candidate_skills: string[];
  candidate_experience: string | null;
  candidate_education: string | null;
};

type SavedRow = PostingSummaryRow & { status: PostingStatus; saved_at: string };

const COLUMNS = 'id,full_name,phone,headline,skills,experience,education';
const APPLICANT_COLUMNS =
  'candidate_id,candidate_name,candidate_phone,candidate_headline,candidate_skills,candidate_experience,candidate_education';
const SAVED_COLUMNS = `${SUMMARY_COLUMNS},status,saved_at`;

// Postgres: RLS with check failed (posting DRAFT / not a Candidate) or the posting does not exist.
const NOT_SAVABLE = ['42501', '23503'];

function toProfile(row: ProfileRow): CandidateProfile {
  return {
    userId: row.id,
    fullName: row.full_name,
    phone: row.phone,
    headline: row.headline,
    skills: row.skills,
    experience: row.experience,
    education: row.education,
  };
}

/** Runs as the signed-in user: profiles RLS shows only the own row; Employers read applicants through the view. */
export class SupabaseCandidateRepository implements ICandidateRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findProfile(id: CandidateId) {
    const { data, error } = await this.supabase
      .from('profiles')
      .select(COLUMNS)
      .eq('id', id)
      .eq('role', 'CANDIDATE')
      .maybeSingle<ProfileRow>();
    if (error) throw new Error(`Không đọc được hồ sơ ứng viên: ${error.message}`);
    return data ? toProfile(data) : null;
  }

  async updateProfile(id: CandidateId, changes: CandidateProfileChanges) {
    // Drop undefined so a partial update only touches the given columns.
    const columns = Object.fromEntries(Object.entries(changes).filter(([, v]) => v !== undefined));
    const { data, error } = await this.supabase
      .from('profiles')
      .update(columns)
      .eq('id', id)
      .eq('role', 'CANDIDATE')
      .select(COLUMNS)
      .maybeSingle<ProfileRow>();
    if (error) throw new Error(`Không cập nhật được hồ sơ ứng viên: ${error.message}`);
    return data ? toProfile(data) : null;
  }

  async findApplicantProfile(employerId: EmployerId, applicationId: ApplicationId) {
    const { data, error } = await this.supabase
      .from('employer_application_summaries')
      .select(APPLICANT_COLUMNS)
      .eq('id', applicationId)
      .eq('employer_id', employerId)
      .maybeSingle<ApplicantRow>();
    if (error) throw new Error(`Không đọc được hồ sơ ứng viên: ${error.message}`);
    return data
      ? toProfile({
          id: data.candidate_id,
          full_name: data.candidate_name,
          phone: data.candidate_phone,
          headline: data.candidate_headline,
          skills: data.candidate_skills,
          experience: data.candidate_experience,
          education: data.candidate_education,
        })
      : null;
  }

  async removeSaved(candidateId: CandidateId, postingId: JobPostingId) {
    const { data, error } = await this.supabase
      .from('saved_postings')
      .delete()
      .eq('candidate_id', candidateId)
      .eq('posting_id', postingId)
      .select('posting_id');
    if (error) throw new Error(`Không bỏ lưu được tin: ${error.message}`);
    return data.length > 0;
  }

  async addSaved(candidateId: CandidateId, postingId: JobPostingId) {
    const { error } = await this.supabase
      .from('saved_postings')
      .upsert({ candidate_id: candidateId, posting_id: postingId }, { ignoreDuplicates: true });
    if (error && NOT_SAVABLE.includes(error.code)) return false;
    if (error) throw new Error(`Không lưu được tin: ${error.message}`);
    return true;
  }

  async listSaved(candidateId: CandidateId) {
    const { data, error } = await this.supabase
      .from('saved_posting_summaries')
      .select(SAVED_COLUMNS)
      .eq('candidate_id', candidateId)
      .order('saved_at', { ascending: false })
      .returns<SavedRow[]>();
    if (error) throw new Error(`Không đọc được danh sách tin đã lưu: ${error.message}`);
    return data.map(
      (row): SavedPostingRow => ({ ...toPostingSummary(row), status: row.status, savedAt: new Date(row.saved_at).toISOString() }),
    );
  }

  async listSavedIds(candidateId: CandidateId) {
    const { data, error } = await this.supabase
      .from('saved_postings')
      .select('posting_id')
      .eq('candidate_id', candidateId)
      .order('created_at', { ascending: false })
      .returns<{ posting_id: JobPostingId }[]>();
    if (error) throw new Error(`Không đọc được danh sách tin đã lưu: ${error.message}`);
    return data.map((r) => r.posting_id);
  }
}
