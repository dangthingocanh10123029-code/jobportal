import Link from 'next/link';
import { listSavedTalent } from '@/actions/talent';
import { TalentCard } from '@/components/talent/talent-card';
import { EmptyState, PageHeader } from '@/components/ui/primitives';

export const metadata = { title: 'Ứng viên đã lưu — Job Portal' };

export default async function SavedTalentPage() {
  const talents = await listSavedTalent();
  return (
    <main className="page-shell talent-page">
      <PageHeader actions={<Link className="button button-quiet" href="/employer/talent">Tìm ứng viên</Link>} description={`${talents.length} ứng viên bạn đã lưu. Ứng viên tắt “Sẵn sàng tìm việc” sẽ không hiển thị.`} eyebrow="Nhà tuyển dụng" title="Ứng viên đã lưu" />
      {talents.length ? (
        <div aria-label="Danh sách ứng viên đã lưu" className="talent-grid">{talents.map((talent) => <TalentCard key={talent.candidateId} talent={talent} />)}</div>
      ) : (
        <EmptyState action={<Link className="button button-primary" href="/employer/talent">Tìm ứng viên</Link>} description="Lưu ứng viên tiềm năng từ trang hồ sơ để xem lại sau." title="Chưa lưu ứng viên nào" />
      )}
    </main>
  );
}
