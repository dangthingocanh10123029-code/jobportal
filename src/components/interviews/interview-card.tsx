import type { ReactNode } from 'react';
import type { Interview } from '@/actions/types';
import { Badge } from '@/components/ui/primitives';
import { formatInterviewTime, interviewModeLabels, interviewStatusLabels, interviewStatusTones } from './labels';

/** One scheduled interview; `heading` names the other party, `actions` holds the role's buttons. */
export function InterviewCard({ interview, heading, actions }: { interview: Interview; heading?: ReactNode; actions?: ReactNode }) {
  const { day, time } = formatInterviewTime(interview.scheduledAt, interview.durationMinutes);
  const joinable = interview.mode === 'ONLINE' && (interview.status === 'PROPOSED' || interview.status === 'CONFIRMED');

  return (
    <article className={`interview-card interview-${interview.status.toLowerCase()}`}>
      <div className="interview-card-when">
        <strong>{time}</strong>
        <span>{day}</span>
        <small>{interview.durationMinutes} phút · giờ Việt Nam</small>
      </div>
      <div className="interview-card-body">
        <div className="interview-card-heading">
          {heading ? <div className="interview-card-title">{heading}</div> : null}
          <Badge tone={interviewStatusTones[interview.status]}>{interviewStatusLabels[interview.status]}</Badge>
        </div>
        <p className="interview-card-location">
          <span className="interview-mode">{interviewModeLabels[interview.mode]}</span>
          {interview.mode === 'ONSITE' ? interview.location : <span className="interview-link-text">{interview.location}</span>}
        </p>
        {interview.note ? <p className="interview-note"><strong>Ghi chú của nhà tuyển dụng:</strong> {interview.note}</p> : null}
        {interview.candidateNote ? <p className="interview-note"><strong>Ghi chú của ứng viên:</strong> {interview.candidateNote}</p> : null}
        {joinable || actions ? (
          <div className="interview-card-actions">
            {joinable ? (
              <a className="button button-primary button-small" href={interview.location} rel="noopener noreferrer" target="_blank">
                Tham gia phỏng vấn
              </a>
            ) : null}
            {actions}
          </div>
        ) : null}
      </div>
    </article>
  );
}
