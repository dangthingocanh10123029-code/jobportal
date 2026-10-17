'use server';

import { apiFetch } from '@/lib/api';
import { readOr } from './_shared';
import type { EmployerDashboard } from './types';

/** null for anyone but a signed-in Employer. */
export async function getEmployerDashboard(): Promise<EmployerDashboard | null> {
  return readOr(await apiFetch<EmployerDashboard>('/me/dashboard'), null);
}
