'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** Re-fetches server data every 10 s while the tab is visible (no realtime library, contract 41). */
export function AutoRefresh() {
  const router = useRouter();
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh();
    }, 10_000);
    return () => window.clearInterval(id);
  }, [router]);
  return null;
}
