'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export type NavLink = [href: string, label: string];

// ponytail: compares the path only, so '/guide?category=SALARY' never lights up; read search params if that matters.
const isCurrent = (pathname: string, href: string) =>
  !href.includes('?') && (pathname === href || (href !== '/' && pathname.startsWith(`${href}/`)));

export function NavLinks({ items }: { items: NavLink[] }) {
  const pathname = usePathname();
  return items.map(([href, label]) => (
    <Link aria-current={isCurrent(pathname, href) ? 'page' : undefined} href={href} key={href}>{label}</Link>
  ));
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
