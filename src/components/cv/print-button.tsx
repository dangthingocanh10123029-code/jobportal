'use client';
import { Printer } from 'lucide-react';
import { icon } from '@/components/ui/primitives';

export function PrintButton() {
  return <button className="button button-primary" onClick={() => window.print()} type="button"><Printer {...icon} />Lưu PDF</button>;
}
