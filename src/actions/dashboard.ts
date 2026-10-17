'use server';

import { apiFetch } from '@/lib/api';
import type { EmployerDashboard } from './types';

/** null for anyone but a signed-in Employer. */
export async function getEmployerDashboard(): Promise<EmployerDashboard | null> {
  const res = await apiFetch<EmployerDashboard>('/me/dashboard');
  return res.ok ? res.data : null;
}
