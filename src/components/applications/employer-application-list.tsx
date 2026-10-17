'use client';

import { useState } from 'react';
import {
  changeApplicationStatusAction,
  getResumeUrlAction,
} from '@/actions/applications';
import type { ApplicationStatus, EmployerApplicationSummary } from '@/actions/types';
import { allowedNextStatuses } from '@/lib/application-status';
import { applicationStatusLabels, formatDate } from '@/components/format';
import { ApplicantProfileDetails } from './applicant-profile-details';

const transitionLabels: Partial<Record<ApplicationStatus, string>> = {
  REVIEWING: 'Bắt đầu xem xét',
  INTERVIEWING: 'Mời phỏng vấn',
  OFFERED: 'Gửi đề nghị',
  HIRED: 'Đánh dấu đã tuyển',
  REJECTED: 'Từ chối hồ sơ',
};

function EmployerApplicationCard({ application }: { application: EmployerApplicationSummary }) {
  const [status, setStatus] = useState(application.status);
  const [pendingStatus, setPendingStatus] = useState<ApplicationStatus | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nextStatuses = allowedNextStatuses(status, 'EMPLOYER');

  async function updateStatus(toStatus: ApplicationStatus) {
    if (toStatus === 'REJECTED' && !window.confirm('Bạn có chắc muốn từ chối hồ sơ này?')) return;

    setError(null);
    setPendingStatus(toStatus);
    try {
      const result = await changeApplicationStatusAction({ applicationId: application.id, toStatus });
      if (result.success) setStatus(result.data.status);
      else setError(result.error);
    } catch {
      setError('Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setPendingStatus(null);
    }
  }

  async function downloadResume() {
    setError(null);
    setDownloading(true);
    // Open synchronously from the click so the browser does not block the signed URL tab.
    const tab = window.open('', '_blank');
    try {
      const result = await getResumeUrlAction({ applicationId: application.id });
      if (result.success) {
        if (tab) {
          tab.location.href = result.data.url;
        } else {
          window.location.href = result.data.url;
        }
      } else {
        tab?.close();
        setError(result.error);
      }
    } catch {
      tab?.close();
      setError('Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <article className="candidate-application-card employer-application-card">
      <div className="candidate-application-main">
        <div className="candidate-application-heading">
          <div>
            <h2>{application.candidateName}</h2>
            <p>{application.candidatePhone || 'Ứng viên chưa cung cấp số điện thoại'}</p>
          </div>
          <span className={`application-status status-${status.toLowerCase()}`}>
            <span aria-hidden="true" className="status-dot" />
            {applicationStatusLabels[status]}
          </span>
        </div>
        {application.candidateHeadline ? <p className="applicant-headline">{application.candidateHeadline}</p> : null}
        {application.candidateSkills.length ? <div aria-label="Kỹ năng ứng viên" className="posting-skill-list applicant-skills">{application.candidateSkills.map((skill) => <span className="skill-tag" key={skill}>{skill}</span>)}</div> : null}
        <div className="candidate-application-meta employer-application-meta">
          <span>Nhận hồ sơ ngày {formatDate(application.createdAt)}</span>
          <button className="button button-quiet button-small" disabled={downloading} onClick={downloadResume} type="button">
            {downloading ? 'Đang tạo link…' : 'Tải CV'}
          </button>
          <ApplicantProfileDetails applicationId={application.id} />
        </div>
      </div>

      {nextStatuses.length > 0 ? (
        <div aria-label={`Cập nhật trạng thái hồ sơ của ${application.candidateName}`} className="employer-application-actions">
          {nextStatuses.map((nextStatus) => (
            <button
              className={`button button-small ${nextStatus === 'REJECTED' ? 'button-danger' : 'button-primary'}`}
              disabled={pendingStatus !== null}
              key={nextStatus}
              onClick={() => updateStatus(nextStatus)}
              type="button"
            >
              {pendingStatus === nextStatus ? 'Đang cập nhật…' : transitionLabels[nextStatus]}
            </button>
          ))}
        </div>
      ) : null}
      {error ? <p className="form-error employer-application-error" role="alert">{error}</p> : null}
    </article>
  );
}

export function EmployerApplicationList({ applications }: { applications: EmployerApplicationSummary[] }) {
  return (
    <section aria-label="Danh sách hồ sơ ứng tuyển" className="candidate-application-list">
      {applications.map((application) => (
        <EmployerApplicationCard application={application} key={application.id} />
      ))}
    </section>
  );
}
