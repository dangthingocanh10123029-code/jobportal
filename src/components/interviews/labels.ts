import type { Interview, InterviewMode, InterviewStatus } from '@/actions/types';

export const interviewStatusLabels: Record<InterviewStatus, string> = {
  PROPOSED: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  DECLINED: 'Ứng viên từ chối',
  RESCHEDULE_REQUESTED: 'Xin đổi giờ',
  CANCELLED: 'Đã hủy',
  DONE: 'Đã phỏng vấn',
};

export const interviewStatusTones: Record<InterviewStatus, 'neutral' | 'success' | 'warning' | 'danger' | 'info'> = {
  PROPOSED: 'warning',
  CONFIRMED: 'success',
  DECLINED: 'danger',
  RESCHEDULE_REQUESTED: 'warning',
  CANCELLED: 'neutral',
  DONE: 'info',
};

export const interviewModeLabels: Record<InterviewMode, string> = { ONLINE: 'Trực tuyến', ONSITE: 'Tại văn phòng' };

/** PROPOSED/CONFIRMED block a new schedule; RESCHEDULE_REQUESTED must be cancelled first. */
export const isActiveInterview = (interview: Interview) =>
  interview.status === 'PROPOSED' || interview.status === 'CONFIRMED' || interview.status === 'RESCHEDULE_REQUESTED';

const VN_TIME = { timeZone: 'Asia/Ho_Chi_Minh' } as const;

export function formatInterviewTime(scheduledAt: string, durationMinutes: number) {
  const start = new Date(scheduledAt);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  const day = new Intl.DateTimeFormat('vi-VN', { ...VN_TIME, weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(start);
  const time = new Intl.DateTimeFormat('vi-VN', { ...VN_TIME, hour: '2-digit', minute: '2-digit', hour12: false });
  return { day, time: `${time.format(start)} – ${time.format(end)}` };
}

/** datetime-local value ("YYYY-MM-DDTHH:mm", typed in Vietnam time) → ISO 8601 with +07:00. */
export const vietnamLocalToIso = (value: string) => `${value.slice(0, 16)}:00+07:00`;

/** Now in Vietnam time as a datetime-local value, for the input's min. */
export const vietnamLocalNow = (now = Date.now()) => new Date(now + 7 * 3_600_000).toISOString().slice(0, 16);
