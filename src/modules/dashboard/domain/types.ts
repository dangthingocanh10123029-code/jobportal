import type { ApplicationStatus, EmployerDashboard, PostingStatus } from '@/actions/types';
import type { EmployerId } from '@/modules/job-posting';

export type { EmployerDashboard, EmployerId };

/** One of the Employer's postings with its view count and Application count per status (missing = 0). */
export type PostingStats = {
  id: string;
  title: string;
  status: PostingStatus;
  applicationDeadline: string;
  views: number;
  applicationsByStatus: Partial<Record<ApplicationStatus, number>>;
};

export interface IDashboardRepository {
  /** Every posting of the Employer, newest first. */
  listPostingStats(employerId: EmployerId): Promise<PostingStats[]>;
}
