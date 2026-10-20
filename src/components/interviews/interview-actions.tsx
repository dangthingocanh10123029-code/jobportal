'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { cancelInterviewAction, markInterviewDoneAction, respondInterviewAction } from '@/actions/interviews';
import type { ActionResult, Interview } from '@/actions/types';

function useInterviewAction() {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function run(key: string, call: () => Promise<ActionResult<Interview>>) {
    setError('');
    setPending(key);
    try {
      const result = await call();
      if (!result.success) {
        setError(result.error);
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError('Có lỗi xảy ra, vui lòng thử lại');
      return false;
    } finally {
      setPending(null);
    }
  }

  return { pending, error, run };
}

function ActionError({ error }: { error: string }) {
  return <p aria-live="polite" className="form-error interview-action-error" role={error ? 'alert' : undefined}>{error}</p>;
}

/** Candidate: confirm, decline, or ask for another time (note required) while PROPOSED. */
export function CandidateInterviewActions({ interview }: { interview: Interview }) {
  const { pending, error, run } = useInterviewAction();
  const [mode, setMode] = useState<'DECLINE' | 'RESCHEDULE' | null>(null);
  const [note, setNote] = useState('');
  if (interview.status !== 'PROPOSED') return null;

  const respond = (response: 'CONFIRM' | 'DECLINE' | 'RESCHEDULE') =>
    run(response, () => respondInterviewAction({ interviewId: interview.id, response, note }));

  if (mode) {
    const noteId = `interview-note-${interview.id}`;
    return (
      <form
        className="interview-inline-form"
        onSubmit={async (event) => {
          event.preventDefault();
          if (await respond(mode)) setMode(null);
        }}
      >
        <label className="field-label" htmlFor={noteId}>
          {mode === 'RESCHEDULE' ? 'Giờ bạn muốn đổi' : <>Lý do từ chối <span className="field-optional">(không bắt buộc)</span></>}
        </label>
        <textarea
          autoFocus
          className="text-input textarea-input interview-textarea"
          id={noteId}
          maxLength={500}
          onChange={(event) => setNote(event.target.value)}
          placeholder={mode === 'RESCHEDULE' ? 'Ví dụ: Tôi rảnh chiều thứ Năm 23/10 từ 14:00' : ''}
          required={mode === 'RESCHEDULE'}
          value={note}
        />
        <div className="interview-inline-buttons">
          <button className={`button button-small ${mode === 'DECLINE' ? 'button-danger' : 'button-primary'}`} disabled={pending !== null} type="submit">
            {pending ? 'Đang gửi…' : mode === 'DECLINE' ? 'Xác nhận từ chối' : 'Gửi yêu cầu đổi giờ'}
          </button>
          <button className="button button-quiet button-small" disabled={pending !== null} onClick={() => setMode(null)} type="button">Quay lại</button>
        </div>
        <ActionError error={error} />
      </form>
    );
  }

  return (
    <>
      <button className="button button-primary button-small" disabled={pending !== null} onClick={() => respond('CONFIRM')} type="button">
        {pending === 'CONFIRM' ? 'Đang xác nhận…' : 'Xác nhận tham gia'}
      </button>
      <button className="button button-quiet button-small" disabled={pending !== null} onClick={() => setMode('RESCHEDULE')} type="button">Xin đổi giờ</button>
      <button className="button button-danger button-small" disabled={pending !== null} onClick={() => setMode('DECLINE')} type="button">Từ chối</button>
      <ActionError error={error} />
    </>
  );
}

/** Employer: cancel an open interview (optional reason), or mark a confirmed one done once its time has come. */
export function EmployerInterviewActions({ interview }: { interview: Interview }) {
  const { pending, error, run } = useInterviewAction();
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');
  const cancellable = ['PROPOSED', 'CONFIRMED', 'RESCHEDULE_REQUESTED'].includes(interview.status);
  const canMarkDone = interview.status === 'CONFIRMED' && Date.parse(interview.scheduledAt) <= Date.now();
  if (!cancellable) return null;

  if (cancelling) {
    const reasonId = `interview-cancel-${interview.id}`;
    return (
      <form
        className="interview-inline-form"
        onSubmit={async (event) => {
          event.preventDefault();
          if (await run('CANCEL', () => cancelInterviewAction({ interviewId: interview.id, reason }))) setCancelling(false);
        }}
      >
        <label className="field-label" htmlFor={reasonId}>
          Lý do hủy <span className="field-optional">(gửi kèm thông báo cho ứng viên)</span>
        </label>
        <textarea autoFocus className="text-input textarea-input interview-textarea" id={reasonId} maxLength={500} onChange={(event) => setReason(event.target.value)} value={reason} />
        <div className="interview-inline-buttons">
          <button className="button button-danger button-small" disabled={pending !== null} type="submit">{pending ? 'Đang hủy…' : 'Xác nhận hủy lịch'}</button>
          <button className="button button-quiet button-small" disabled={pending !== null} onClick={() => setCancelling(false)} type="button">Giữ lịch</button>
        </div>
        <ActionError error={error} />
      </form>
    );
  }

  return (
    <>
      {canMarkDone ? (
        <button className="button button-primary button-small" disabled={pending !== null} onClick={() => run('DONE', () => markInterviewDoneAction({ interviewId: interview.id }))} type="button">
          {pending === 'DONE' ? 'Đang cập nhật…' : 'Đánh dấu đã phỏng vấn'}
        </button>
      ) : null}
      <button className="button button-danger button-small" disabled={pending !== null} onClick={() => setCancelling(true)} type="button">Hủy lịch</button>
      <ActionError error={error} />
    </>
  );
}
