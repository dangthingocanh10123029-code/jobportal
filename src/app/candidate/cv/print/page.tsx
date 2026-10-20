import Link from 'next/link';
import { getMyCv } from '@/actions/cv';
import { CvDocument } from '@/components/cv/cv-document';
import { PrintButton } from '@/components/cv/print-button';
import { EmptyState, icon } from '@/components/ui/primitives';
import { ArrowLeft } from 'lucide-react';

export const metadata = { title: 'In CV — Job Portal' };

export default async function CandidateCvPrintPage() {
  const cv = await getMyCv();
  if (!cv) {
    return <main className="page-shell"><EmptyState action={<Link className="button button-primary" href="/candidate/cv">Tạo CV online</Link>} description="Hãy tạo và lưu CV online trước khi in." title="Chưa có CV online" /></main>;
  }

  return (
    <main className="page-shell cv-print-page">
      <div className="cv-print-toolbar">
        <Link className="back-link" href="/candidate/cv"><ArrowLeft {...icon} />Chỉnh sửa CV</Link>
        <PrintButton />
      </div>
      <CvDocument cv={cv} />
    </main>
  );
}
