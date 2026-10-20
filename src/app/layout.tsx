import type { ReactNode } from 'react';
import { SiteFooter } from '@/components/navigation/site-footer';
import { SiteHeader } from '@/components/navigation/site-header';
import './globals.css';

export const metadata = {
  title: 'Job Portal — Tìm việc nhanh, ứng tuyển dễ',
  description: 'Tìm kiếm cơ hội nghề nghiệp và quản lý hồ sơ ứng tuyển của bạn.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
