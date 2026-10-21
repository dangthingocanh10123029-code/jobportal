import Link from 'next/link';
import { ArrowRight, Plus } from 'lucide-react';
import { icon } from '@/components/ui/primitives';

/** Recruiter banner. White text sits on a gradient whose lightest stop is capped for ≥ 4.5:1 (see .employer-cta). */
export function EmployerCTA({ isEmployer }: { isEmployer: boolean }) {
  return (
    <section aria-labelledby="employer-cta-title" className="employer-cta">
      <svg aria-hidden="true" className="employer-cta-wave" fill="none" viewBox="0 0 480 240">
        <path d="M0 200C80 150 160 230 240 180S400 120 480 150M0 150C80 100 160 180 240 130S400 70 480 100M0 100C80 50 160 130 240 80S400 20 480 50" stroke="currentColor" strokeWidth="2" />
      </svg>
      <div className="employer-cta-copy">
        <h2 id="employer-cta-title">Bạn đang tuyển dụng?</h2>
        <p>Đăng tin miễn phí, nhận hồ sơ và trao đổi với ứng viên ngay trên Job Portal.</p>
      </div>
      <div className="employer-cta-actions">
        <Link className="button employer-cta-primary" href="/employer/postings/new"><Plus {...icon} />Đăng tin miễn phí</Link>
        <Link className="button employer-cta-secondary" href={isEmployer ? '/employer/billing' : '/guide'}>Tìm hiểu thêm<ArrowRight {...icon} /></Link>
      </div>
    </section>
  );
}
