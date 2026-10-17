import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { routeGuard } from '@/lib/route-guard';
import { supabaseEnv } from '@/lib/supabase';
import { getCurrentActor } from '@/lib/supabase-server';

export async function middleware(request: NextRequest) {
  const { url, anonKey } = supabaseEnv();
  let response = NextResponse.next({ request });

  // Official @supabase/ssr pattern: refreshed session cookies go to both the request and the response.
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Auth or profile lookup failing must not take the site down: treat the visitor as a guest.
  const actor = await getCurrentActor(supabase).catch(() => null);

  // Locked by an Admin: end the session here, whatever the page (contract §32).
  if (actor?.locked) {
    await supabase.auth.signOut().catch(() => null);
    if (request.nextUrl.pathname === '/login') return response; // signed out now: a guest on the login page
    const locked = NextResponse.redirect(new URL('/login?error=locked', request.url));
    response.cookies.getAll().forEach((cookie) => locked.cookies.set(cookie));
    return locked;
  }

  const target = routeGuard(request.nextUrl.pathname, actor?.role ?? null);
  if (!target) return response;

  const redirect = NextResponse.redirect(new URL(target, request.url));
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export const config = {
  // Skip static assets and images; everything else refreshes the session.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.png|opengraph-image.png|images/).*)'],
};
