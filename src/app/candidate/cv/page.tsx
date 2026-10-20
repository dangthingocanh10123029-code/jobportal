import { getMyCandidateProfile } from '@/actions/candidates';
import { getMyCv } from '@/actions/cv';
import type { CvContent } from '@/components/cv/cv-document';
import { CvEditor } from '@/components/cv/cv-editor';

export const metadata = { title: 'CV online — Job Portal' };

export default async function CandidateCvPage() {
  const [cv, profile] = await Promise.all([getMyCv(), getMyCandidateProfile()]);
  // New CV: prefill from the candidate profile so the first draft is not blank.
  const initial: CvContent = cv ?? {
    template: 'CLASSIC', fullName: profile?.fullName ?? '', headline: profile?.headline ?? null, email: '', phone: profile?.phone ?? null,
    location: null, summary: null, experiences: [], educations: [], skills: profile?.skills.slice(0, 30) ?? [], languages: [], certifications: [],
  };

  return (
    <main className="page-shell cv-page">
      <div className="page-heading">
        <span className="eyebrow">CV online</span>
        <h1>CV của tôi</h1>
        <p>{cv ? `Cập nhật lần cuối ${new Date(cv.updatedAt).toLocaleDateString('vi-VN')}. Đơn đã nộp giữ nguyên bản CV lúc nộp.` : 'Bạn chưa có CV online. Điền thông tin bên dưới rồi bấm "Lưu CV" để dùng khi ứng tuyển.'}</p>
      </div>
      <CvEditor hasCv={cv !== null} initial={initial} />
    </main>
  );
}
