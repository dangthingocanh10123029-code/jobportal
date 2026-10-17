// Helpers for the Server Action files. Deliberately not 'use server': nothing here may be callable from the client.
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseServerClient, getCurrentActor } from '@/lib/supabase-server';
import type { CandidateId } from '@/modules/application';
import type { EmployerId } from '@/modules/job-posting';
import type { Role } from '@/modules/shared/types';

export const fail = (error: string) => ({ success: false, error }) as const;

/** The request's Supabase client and the signed-in user's id; null when signed out or (with `role`) another role. */
async function signedIn(role?: Role): Promise<{ supabase: SupabaseClient; userId: string } | null> {
  const supabase = await createSupabaseServerClient();
  const actor = await getCurrentActor(supabase);
  if (!actor || (role && actor.role !== role)) return null;
  return { supabase, userId: actor.userId };
}

export const requireSignedIn = () => signedIn();

export async function requireEmployer(): Promise<{ supabase: SupabaseClient; employerId: EmployerId } | null> {
  const ctx = await signedIn('EMPLOYER');
  return ctx && { supabase: ctx.supabase, employerId: ctx.userId as EmployerId };
}

export async function requireCandidate(): Promise<{ supabase: SupabaseClient; candidateId: CandidateId } | null> {
  const ctx = await signedIn('CANDIDATE');
  return ctx && { supabase: ctx.supabase, candidateId: ctx.userId as CandidateId };
}
