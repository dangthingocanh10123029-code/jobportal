import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { cache } from 'react';
import type { Actor, Profile, Role } from '@/actions/types';
import { supabaseEnv } from './supabase';

/** Supabase client bound to the request's session cookie (Server Components, Server Actions, Route Handlers). */
export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const { url, anonKey } = supabaseEnv();
  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot set cookies; middleware refreshes the session instead.
        }
      },
    },
  });
}

type ProfileRow = {
  id: string;
  role: Role;
  full_name: string | null;
  phone: string | null;
  company_name: string | null;
};

const PROFILE_COLUMNS = 'id, role, full_name, phone, company_name';

function toProfile(row: ProfileRow): Profile {
  return {
    userId: row.id,
    role: row.role,
    fullName: row.full_name,
    phone: row.phone,
    companyName: row.company_name,
  };
}

/** Profile of the signed-in user (RLS: own row only), or null when signed out. */
export async function fetchProfile(supabase: SupabaseClient, userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', userId)
    .maybeSingle<ProfileRow>();
  if (error) throw new Error(`Không đọc được profile: ${error.message}`);
  return data ? toProfile(data) : null;
}

/** Actor from the server session (getUser verifies the JWT with Supabase Auth); null when signed out. */
// cache(): layout and page share one lookup per request (keyed by the `supabase` argument).
export const getCurrentActor = cache(async (supabase?: SupabaseClient): Promise<Actor | null> => {
  const client = supabase ?? (await createSupabaseServerClient());
  const { data } = await client.auth.getUser();
  if (!data.user) return null;
  const profile = await fetchProfile(client, data.user.id);
  return profile ? { userId: profile.userId, role: profile.role } : null;
});
