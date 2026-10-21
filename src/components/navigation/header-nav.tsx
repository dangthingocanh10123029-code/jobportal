'use client';

import { Suspense, useEffect, useRef, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

export type NavLink = [href: string, label: string];

// A link with a query ('/guide?category=SALARY') is current only when its params match; it then wins over the plain path link.
export const isCurrent = (pathname: string, search: URLSearchParams | null, href: string) => {
  const [path, query] = href.split('?');
  if (query) return pathname === path && !!search && [...new URLSearchParams(query)].every(([k, v]) => search.get(k) === v);
  return pathname === path || (path !== '/' && pathname.startsWith(`${path}/`));
};

function Links({ items, search }: { items: NavLink[]; search: URLSearchParams | null }) {
  const pathname = usePathname();
  const queryHit = items.some(([href]) => href.includes('?') && isCurrent(pathname, search, href));
  return items.map(([href, label]) => {
    const current = isCurrent(pathname, search, href) && (href.includes('?') || !queryHit);
    return <Link aria-current={current ? 'page' : undefined} href={href} key={href}>{label}</Link>;
  });
}

function LinksWithSearch({ items }: { items: NavLink[] }) {
  return <Links items={items} search={useSearchParams()} />;
}

export function NavLinks({ items }: { items: NavLink[] }) {
  // useSearchParams needs a Suspense boundary on prerendered pages; the fallback matches by path only.
  return <Suspense fallback={<Links items={items} search={null} />}><LinksWithSearch items={items} /></Suspense>;
}

/** `<details>` dropdown that closes on navigation, outside click and Escape. */
export function HeaderMenu({ className, summary, label, children }: { className: string; summary: ReactNode; label: string; children: ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();

  useEffect(() => { ref.current?.removeAttribute('open'); }, [pathname]);
  useEffect(() => {
    const close = (event: Event) => {
      const menu = ref.current;
      if (!menu?.open) return;
      if (event instanceof KeyboardEvent ? event.key === 'Escape' : !menu.contains(event.target as Node)) menu.open = false;
    };
    document.addEventListener('click', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('click', close); document.removeEventListener('keydown', close); };
  }, []);

  return (
    <details className={className} ref={ref}>
      <summary aria-label={label}>{summary}</summary>
      {children}
    </details>
  );
}
