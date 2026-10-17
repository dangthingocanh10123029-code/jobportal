import { describe, expect, it } from 'vitest';
import { InMemoryDashboardRepository } from './adapters/in-memory';
import type { JobPostingId } from '@/modules/job-posting';
import { DashboardService, type EmployerId, type PostingStats } from './index';

const now = () => new Date('2026-10-17T00:00:00Z');
const posting = (id: string, status: PostingStats['status'], deadline: string, views: number, applicationsByStatus: PostingStats['applicationsByStatus']): PostingStats => ({
  id: id as JobPostingId, title: `Tin ${id}`, status, applicationDeadline: deadline, views, applicationsByStatus,
});

describe('DashboardService.forEmployer', () => {
  it('tổng, byStatus đủ 7 khóa, open = PUBLISHED chưa hết hạn', async () => {
    const repo = new InMemoryDashboardRepository({
      emp: [
        posting('1', 'PUBLISHED', '2026-12-01T00:00:00Z', 10, { SUBMITTED: 2, REVIEWING: 1 }),
        posting('2', 'PUBLISHED', '2026-10-01T00:00:00Z', 5, { HIRED: 1, WITHDRAWN: 1 }),
        posting('3', 'DRAFT', '2026-12-01T00:00:00Z', 0, {}),
      ],
    });
    expect(await new DashboardService(repo, now).forEmployer('emp' as EmployerId)).toEqual({
      totals: { postings: 3, open: 1, applications: 5, views: 15 },
      byStatus: { SUBMITTED: 2, REVIEWING: 1, INTERVIEWING: 0, OFFERED: 0, HIRED: 1, REJECTED: 0, WITHDRAWN: 1 },
      postings: [
        { id: '1', title: 'Tin 1', displayStatus: 'PUBLISHED', views: 10, applications: 3 },
        { id: '2', title: 'Tin 2', displayStatus: 'EXPIRED', views: 5, applications: 2 },
        { id: '3', title: 'Tin 3', displayStatus: 'DRAFT', views: 0, applications: 0 },
      ],
    });
  });

  it('chưa có tin → mọi số = 0', async () => {
    const dashboard = await new DashboardService(new InMemoryDashboardRepository(), now).forEmployer('emp' as EmployerId);
    expect(dashboard.totals).toEqual({ postings: 0, open: 0, applications: 0, views: 0 });
    expect(Object.values(dashboard.byStatus)).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });
});
