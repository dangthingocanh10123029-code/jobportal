import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { supabaseEnv } from './supabase';

const BASE = 'http://internal.invalid';

/** `next` only if it stays on this site (path starting with '/'), otherwise '/account' — blocks open redirects. */
export function safeNext(next: string | null): string {
  if (!next?.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return '/account';
  // The URL parser strips tabs/newlines and folds '\' into '/', so check where it really lands.
  const url = new URL(next, BASE);
  return url.origin === BASE ? url.pathname + url.search + url.hash : '/account';
}

/** Email confirmation link (PKCE `?code=`): swap the code for a session cookie, then go to `next`. */
export async function handleAuthCallback(request: NextRequest): Promise<NextResponse> {
  const code = request.nextUrl.searchParams.get('code');
  if (!code) return NextResponse.redirect(new URL('/login?error=link', request.url));

  const { url, anonKey } = supabaseEnv();
  const response = NextResponse.redirect(new URL(safeNext(request.nextUrl.searchParams.get('next')), request.url));
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL('/login?error=link', request.url));
  return response;
}
