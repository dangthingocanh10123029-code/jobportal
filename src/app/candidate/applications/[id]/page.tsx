import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getMyApplication } from '@/actions/applications';
import type { StatusChange } from '@/actions/types';
import { allowedNextStatuses } from '@/lib/application-status';
import { WithdrawApplicationButton } from '@/components/applications/withdraw-application-button';
import { applicationStatusLabels, formatDateTime } from '@/components/format';

function HistoryItem({ change, isLast }: { change: StatusChange; isLast: boolean }) {
  return (
    <li className={`application-history-item${isLast ? ' is-last' : ''}`}>
      <span aria-hidden="true" className={`application-history-marker status-${change.toStatus.toLowerCase()}`} />
      <div className="application-history-copy">
        <strong>
          {change.fromStatus
            ? `${applicationStatusLabels[change.fromStatus]} → ${applicationStatusLabels[change.toStatus]}`
            : `Hồ sơ ${applicationStatusLabels[change.toStatus].toLowerCase()}`}
        </strong>
        <span>{change.changedByRole === 'CANDIDATE' ? 'Ứng viên' : 'Nhà tuyển dụng'} · {formatDateTime(change.changedAt)}</span>
      </div>
    </li>
  );
}

export default async function CandidateApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const application = await getMyApplication(id);
  if (!application) notFound();

  const canWithdraw = allowedNextStatuses(application.status, 'CANDIDATE').includes('WITHDRAWN');

  return (
    <main className="page-shell narrow-shell candidate-application-detail-page">
      <Link className="back-link" href="/candidate/applications">← Quay lại danh sách đơn</Link>

      <section className="surface-card application-detail-card">
        <header className="application-detail-header">
          <span className="eyebrow">Chi tiết hồ sơ</span>
          <h1>{application.postingTitle}</h1>
          <p>{application.companyName}</p>
          <div className="application-detail-current-status">
            <span className={`application-status status-${application.status.toLowerCase()}`}>
              <span aria-hidden="true" className="status-dot" />
              {applicationStatusLabels[application.status]}
            </span>
            <span>Mã hồ sơ: {application.id}</span>
          </div>
        </header>

        <div className="application-history-section">
          <div className="application-history-heading">
            <div>
              <h2>Lịch sử trạng thái</h2>
              <p>Các cập nhật được sắp xếp theo thời gian.</p>
            </div>
            <span aria-hidden="true" className="application-history-count">{application.history.length}</span>
          </div>

          {application.history.length > 0 ? (
            <ol aria-label="Lịch sử thay đổi trạng thái hồ sơ" className="application-history-list">
              {application.history.map((change, index) => (
                <HistoryItem change={change} isLast={index === application.history.length - 1} key={`${change.changedAt}-${index}`} />
              ))}
            </ol>
          ) : (
            <p className="application-history-empty">Chưa có cập nhật trạng thái nào.</p>
          )}
        </div>

        {canWithdraw ? (
          <footer className="application-detail-footer">
            <div>
              <strong>Bạn muốn dừng ứng tuyển?</strong>
              <p>Rút hồ sơ sẽ cập nhật trạng thái thành “Đã rút hồ sơ”.</p>
            </div>
            <WithdrawApplicationButton applicationId={application.id} />
          </footer>
        ) : null}
      </section>
    </main>
  );
}
