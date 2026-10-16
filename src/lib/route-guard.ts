import type { Role } from '@/actions/types';

const ROLE_AREAS: Record<string, Role> = { '/employer': 'EMPLOYER', '/candidate': 'CANDIDATE' };
const AUTH_ONLY = ['/account'];
const GUEST_ONLY = ['/login', '/signup'];

const under = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

/** Where to redirect for this path and role (null = not signed in); null = allow. */
export function routeGuard(pathname: string, role: Role | null): string | null {
  const areaRole = Object.entries(ROLE_AREAS).find(([prefix]) => under(pathname, prefix))?.[1];
  const needsAuth = areaRole !== undefined || AUTH_ONLY.some((p) => under(pathname, p));

  if (role === null) return needsAuth ? `/login?next=${encodeURIComponent(pathname)}` : null;
  if (areaRole && areaRole !== role) return '/';
  if (GUEST_ONLY.some((p) => under(pathname, p))) return '/';
  return null;
}
