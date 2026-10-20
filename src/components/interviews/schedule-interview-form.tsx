'use client';

import { useRouter } from 'next/navigation';
import { useId, useState, type FormEvent } from 'react';
import { scheduleInterviewAction } from '@/actions/interviews';
import type { InterviewMode } from '@/actions/types';
import { vietnamLocalNow, vietnamLocalToIso } from './labels';

const DURATIONS = [15, 30, 45, 60, 90, 120, 180, 240];

/** "Đặt lịch phỏng vấn" button that opens the form; onScheduled lets the card move REVIEWING → INTERVIEWING. */
export function ScheduleInterviewForm({ applicationId, candidateName, onScheduled }: { applicationId: string; candidateName: string; onScheduled?: () => void }) {
  const router = useRouter();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<InterviewMode>('ONLINE');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [min, setMin] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError('');
    setPending(true);
    try {
      const result = await scheduleInterviewAction({
        applicationId,
        scheduledAt: vietnamLocalToIso(String(data.get('scheduledAt') ?? '')),
        durationMinutes: Number(data.get('durationMinutes')),
        mode,
        location: String(data.get('location') ?? ''),
        note: String(data.get('note') ?? ''),
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setOpen(false);
      onScheduled?.();
      router.refresh();
    } catch {
      setError('Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <button
        className="button button-primary button-small"
        onClick={() => {
          setMin(vietnamLocalNow());
          setOpen(true);
        }}
        type="button"
      >
        Đặt lịch phỏng vấn
      </button>
    );
  }

  return (
    <form aria-label={`Đặt lịch phỏng vấn với ${candidateName}`} className="form-stack schedule-interview-form" onSubmit={submit}>
      <div className="form-field-grid">
        <label className="field-label" htmlFor={`${id}-at`}>
          Ngày giờ (giờ Việt Nam)
          <input autoFocus className="text-input" id={`${id}-at`} min={min} name="scheduledAt" required type="datetime-local" />
        </label>
        <label className="field-label" htmlFor={`${id}-duration`}>
          Thời lượng
          <select className="text-input select-input" defaultValue="60" id={`${id}-duration`} name="durationMinutes">
            {DURATIONS.map((minutes) => <option key={minutes} value={minutes}>{minutes} phút</option>)}
          </select>
        </label>
      </div>
      <fieldset className="interview-mode-field">
        <legend className="field-label">Hình thức</legend>
        <label><input checked={mode === 'ONLINE'} name="mode" onChange={() => setMode('ONLINE')} type="radio" /> Trực tuyến</label>
        <label><input checked={mode === 'ONSITE'} name="mode" onChange={() => setMode('ONSITE')} type="radio" /> Tại văn phòng</label>
      </fieldset>
      <label className="field-label" htmlFor={`${id}-location`}>
        {mode === 'ONLINE' ? 'Link phỏng vấn' : 'Địa chỉ'}
        <input
          className="text-input"
          id={`${id}-location`}
          key={mode}
          maxLength={mode === 'ONLINE' ? 500 : 300}
          minLength={mode === 'ONSITE' ? 5 : undefined}
          name="location"
          placeholder={mode === 'ONLINE' ? 'https://meet.google.com/…' : 'Số nhà, đường, quận, thành phố'}
          required
          type={mode === 'ONLINE' ? 'url' : 'text'}
        />
      </label>
      <label className="field-label" htmlFor={`${id}-note`}>
        <span>Ghi chú cho ứng viên <span className="field-optional">(không bắt buộc)</span></span>
        <textarea className="text-input textarea-input interview-textarea" id={`${id}-note`} maxLength={1000} name="note" placeholder="Người phỏng vấn, giấy tờ cần mang…" />
      </label>
      <p aria-live="polite" className="form-error" role={error ? 'alert' : undefined}>{error}</p>
      <div className="interview-inline-buttons">
        <button className="button button-primary button-small" disabled={pending} type="submit">{pending ? 'Đang đặt lịch…' : 'Gửi lịch phỏng vấn'}</button>
        <button className="button button-quiet button-small" disabled={pending} onClick={() => setOpen(false)} type="button">Hủy</button>
      </div>
    </form>
  );
}
