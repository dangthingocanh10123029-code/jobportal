import type { ReactNode } from 'react';

export const metadata = {
  title: 'VibeCoding Job Portal',
  description: 'Hệ thống tìm việc online',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
