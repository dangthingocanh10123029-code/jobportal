import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/actions/auth';
import { listMyInterviews } from '@/actions/interviews';
import { CandidateInterviewActions, EmployerInterviewActions } from '@/components/interviews/interview-actions';
import { InterviewCard } from '@/components/interviews/interview-card';
import { EmptyState, PageHeader } from '@/components/ui/primitives';

export const metadata = { title: 'Lịch phỏng vấn — Job Portal' };

type Params = Record<string, string | string[] | undefined>;

export default async function InterviewsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const raw = await searchParams;
  const scope = raw.tab === 'past' ? 'past' : 'upcoming';
  const [profile, interviews] = await Promise.all([getCurrentProfile(), listMyInterviews({ scope })]);
  if (!profile) redirect(`/login?next=${encodeURIComponent('/interviews')}`);
  if (profile.role === 'ADMIN') redirect('/');
  const isEmployer = profile.role === 'EMPLOYER';

  return (
    <main className="page-shell narrow-shell interviews-page">
      <PageHeader
        description={isEmployer ? 'Các buổi phỏng vấn bạn đã đặt với ứng viên.' : 'Các buổi phỏng vấn nhà tuyển dụng đã mời bạn.'}
        eyebrow="Tuyển dụng"
        title="Lịch phỏng vấn"
      />
      <nav aria-label="Lọc lịch phỏng vấn" className="interview-tabs">
        <Link aria-current={scope === 'upcoming' ? 'page' : undefined} href="/interviews">Sắp tới</Link>
        <Link aria-current={scope === 'past' ? 'page' : undefined} href="/interviews?tab=past">Đã qua</Link>
      </nav>

      {interviews.length > 0 ? (
        <section aria-label={scope === 'past' ? 'Lịch phỏng vấn đã qua' : 'Lịch phỏng vấn sắp tới'} className="interview-list">
          {interviews.map((interview) => (
            <InterviewCard
              actions={isEmployer ? <EmployerInterviewActions interview={interview} /> : <CandidateInterviewActions interview={interview} />}
              heading={
                <>
                  <Link href={isEmployer ? `/employer/postings/${interview.postingId}/applications` : `/candidate/applications/${interview.applicationId}`}>
                    {isEmployer ? interview.candidateName : interview.postingTitle}
                  </Link>
                  <span>{isEmployer ? interview.postingTitle : interview.companyName}</span>
                </>
              }
              interview={interview}
              key={interview.id}
            />
          ))}
        </section>
      ) : (
        <EmptyState
          action={
            isEmployer
              ? <Link className="button button-primary button-small" href="/employer/postings">Xem hồ sơ ứng tuyển</Link>
              : <Link className="button button-primary button-small" href="/candidate/applications">Xem đơn ứng tuyển</Link>
          }
          description={scope === 'past' ? 'Các buổi phỏng vấn đã kết thúc sẽ hiện ở đây.' : isEmployer ? 'Đặt lịch từ trang hồ sơ ứng tuyển của từng tin.' : 'Khi nhà tuyển dụng mời phỏng vấn, lịch sẽ hiện ở đây.'}
          icon="📅"
          title={scope === 'past' ? 'Chưa có buổi phỏng vấn nào đã qua' : 'Chưa có lịch phỏng vấn sắp tới'}
        />
      )}
    </main>
  );
}
