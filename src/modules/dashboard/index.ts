import type { ApplicationStatus } from '@/modules/shared/types';
import { TRANSITIONS } from '@/modules/application/domain/status';
import { displayStatus } from '@/modules/job-posting/domain/status';
import type { Clock } from '@/modules/job-posting';
import type { EmployerDashboard, EmployerId, IDashboardRepository } from './domain/types';

export type * from './domain/types';

const STATUSES = Object.keys(TRANSITIONS) as ApplicationStatus[];

/** Employer's hiring overview: postings, views and Applications by status. */
export class DashboardService {
  constructor(
    private readonly repo: IDashboardRepository,
    private readonly now: Clock = () => new Date(),
  ) {}

  async forEmployer(employerId: EmployerId): Promise<EmployerDashboard> {
    const stats = await this.repo.listPostingStats(employerId);
    const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<ApplicationStatus, number>;
    const postings = stats.map((p) => {
      let applications = 0;
      for (const s of STATUSES) {
        const n = p.applicationsByStatus[s] ?? 0;
        byStatus[s] += n;
        applications += n;
      }
      return {
        id: p.id,
        title: p.title,
        displayStatus: displayStatus(p.status, p.applicationDeadline, this.now()),
        views: p.views,
        applications,
      };
    });
    const sum = (key: 'views' | 'applications') => postings.reduce((total, p) => total + p[key], 0);
    return {
      totals: {
        postings: postings.length,
        open: postings.filter((p) => p.displayStatus === 'PUBLISHED').length,
        applications: sum('applications'),
        views: sum('views'),
      },
      byStatus,
      postings,
    };
  }
}
