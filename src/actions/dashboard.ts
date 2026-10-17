'use server';

import { DashboardService } from '@/modules/dashboard';
import { SupabaseDashboardRepository } from '@/modules/dashboard/adapters/supabase';
import { requireEmployer } from './_shared';
import type { EmployerDashboard } from './types';

/** null for anyone but a signed-in Employer. */
export async function getEmployerDashboard(): Promise<EmployerDashboard | null> {
  const ctx = await requireEmployer();
  return ctx && new DashboardService(new SupabaseDashboardRepository(ctx.supabase)).forEmployer(ctx.employerId);
}
