'use server';

import { createSupabaseServerClient, getCurrentActor } from '@/lib/supabase-server';
import { DashboardService } from '@/modules/dashboard';
import { SupabaseDashboardRepository } from '@/modules/dashboard/adapters/supabase';
import type { EmployerId } from '@/modules/job-posting';
import type { EmployerDashboard } from './types';

/** null for anyone but a signed-in Employer. */
export async function getEmployerDashboard(): Promise<EmployerDashboard | null> {
  const supabase = await createSupabaseServerClient();
  const actor = await getCurrentActor(supabase);
  if (actor?.role !== 'EMPLOYER') return null;
  return new DashboardService(new SupabaseDashboardRepository(supabase)).forEmployer(actor.userId as EmployerId);
}
