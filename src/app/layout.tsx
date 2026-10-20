import type { ReactNode } from 'react';
import { Be_Vietnam_Pro, Inter } from 'next/font/google';
import { SiteFooter } from '@/components/navigation/site-footer';
import { SiteHeader } from '@/components/navigation/site-header';
import './globals.css';

const inter = Inter({ subsets: ['latin', 'vietnamese'], variable: '--font-inter', display: 'swap' });
// Fallback named by the design brief (docs/design/white-blue-design-system.md); only fetched if Inter misses a glyph.
const beVietnam = Be_Vietnam_Pro({ subsets: ['latin', 'vietnamese'], weight: ['400', '500', '600', '700'], variable: '--font-vietnam', display: 'swap', preload: false });

export const metadata = {
  title: 'Job Portal — Tìm việc nhanh, ứng tuyển dễ',
  description: 'Tìm kiếm cơ hội nghề nghiệp và quản lý hồ sơ ứng tuyển của bạn.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html className={`${inter.variable} ${beVietnam.variable}`} lang="vi">
      <body>
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
