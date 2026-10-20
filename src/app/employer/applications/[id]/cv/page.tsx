import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getApplicationCv } from '@/actions/cv';
import { CvDocument } from '@/components/cv/cv-document';
import { PrintButton } from '@/components/cv/print-button';
import { ArrowLeft } from 'lucide-react';
import { icon } from '@/components/ui/primitives';

export const metadata = { title: 'CV ứng viên — Job Portal' };

export default async function EmployerApplicationCvPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cv = await getApplicationCv(id);
  if (!cv) notFound();

  return (
    <main className="page-shell cv-print-page">
      <div className="cv-print-toolbar">
        <Link className="back-link" href="/employer/postings"><ArrowLeft {...icon} />Tin tuyển dụng</Link>
        <p className="field-hint">Bản CV online ứng viên gửi lúc nộp đơn.</p>
        <PrintButton />
      </div>
      <CvDocument cv={cv} />
    </main>
  );
}
