import type { ReactNode } from 'react';
import { Be_Vietnam_Pro, Outfit, Patrick_Hand } from 'next/font/google';
import { SiteFooter } from '@/components/navigation/site-footer';
import { SiteHeader } from '@/components/navigation/site-header';
import './globals.css';

// Outfit has no Vietnamese glyphs: without a metric fallback (adjustFontFallback) the browser
// falls through to Be Vietnam Pro for letters like ạ, ế, ữ instead of a local Arial.
const outfit = Outfit({ subsets: ['latin', 'latin-ext'], variable: '--font-outfit', adjustFontFallback: false, display: 'swap' });
const beVietnam = Be_Vietnam_Pro({ subsets: ['latin', 'vietnamese'], weight: ['400', '500', '600', '700'], variable: '--font-vietnam', display: 'swap' });
// Reenie Beanie has no Vietnamese marks; Patrick Hand does (ticket 50).
const handwriting = Patrick_Hand({ subsets: ['latin', 'vietnamese'], weight: '400', variable: '--font-hand', display: 'swap' });

export const metadata = {
  title: 'Job Portal — Tìm việc nhanh, ứng tuyển dễ',
  description: 'Tìm kiếm cơ hội nghề nghiệp và quản lý hồ sơ ứng tuyển của bạn.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html className={`${outfit.variable} ${beVietnam.variable} ${handwriting.variable}`} lang="vi">
      <body>
        <SiteHeader />
        {children}
        <SiteFooter />
        <svg aria-hidden="true" className="grain-overlay" focusable="false">
          <filter id="grain-noise"><feTurbulence baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" type="fractalNoise" /></filter>
          <rect filter="url(#grain-noise)" height="100%" width="100%" />
        </svg>
      </body>
    </html>
  );
}
