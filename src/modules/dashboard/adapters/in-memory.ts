import type { EmployerId, IDashboardRepository, PostingStats } from '../domain/types';

export class InMemoryDashboardRepository implements IDashboardRepository {
  constructor(private readonly rows: Record<string, PostingStats[]> = {}) {}

  async listPostingStats(employerId: EmployerId) {
    return (this.rows[employerId] ?? []).map((r) => ({ ...r }));
  }
}
