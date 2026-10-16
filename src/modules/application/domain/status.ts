import type { ApplicationStatus, Role } from '@/actions/types';

// Spec "Application Status state machine". Mirrored by public.application_transition_allowed
// in supabase/migrations/*_applications.sql.
export const TRANSITIONS: Record<ApplicationStatus, readonly ApplicationStatus[]> = {
  SUBMITTED: ['REVIEWING', 'REJECTED', 'WITHDRAWN'],
  REVIEWING: ['INTERVIEWING', 'REJECTED', 'WITHDRAWN'],
  INTERVIEWING: ['OFFERED', 'REJECTED', 'WITHDRAWN'],
  OFFERED: ['HIRED', 'REJECTED', 'WITHDRAWN'],
  HIRED: [],
  REJECTED: [],
  WITHDRAWN: [],
};

/** Statuses `role` may move an Application to next: Candidate only WITHDRAWN, Employer everything else. */
export function allowedNextStatuses(status: ApplicationStatus, role: Role): ApplicationStatus[] {
  return TRANSITIONS[status].filter((to) => (to === 'WITHDRAWN') === (role === 'CANDIDATE'));
}
