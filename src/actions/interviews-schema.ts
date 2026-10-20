import { z } from 'zod';
import { applicationIdSchema } from './applications-schema';

// Same rules and messages as backend/app/modules/interviews/schemas.py and the interviews table CHECKs.
export const MAX_INTERVIEW_DAYS_AHEAD = 90;
const DAY_MS = 24 * 60 * 60 * 1000;
const TIME_ERROR = 'Giờ phỏng vấn không hợp lệ';
const WINDOW_ERROR = 'Giờ phỏng vấn phải ở tương lai và trong vòng 90 ngày';
const DURATION_ERROR = 'Thời lượng phải từ 15 đến 240 phút';
const URL_ERROR = 'Link phỏng vấn phải là URL http(s)';
const ADDRESS_ERROR = 'Địa chỉ phỏng vấn từ 5 đến 300 ký tự';

/** Trimmed; blank → undefined. */
const optionalText = (max: number, message: string) =>
  z
    .string({ invalid_type_error: message })
    .trim()
    .max(max, message)
    .nullish()
    .transform((s) => s || undefined);

export const interviewIdSchema = z
  .string({ required_error: 'Mã lịch phỏng vấn không hợp lệ', invalid_type_error: 'Mã lịch phỏng vấn không hợp lệ' })
  .uuid('Mã lịch phỏng vấn không hợp lệ');

export const scheduleInterviewSchema = z
  .object({
    applicationId: applicationIdSchema,
    // ISO 8601 with offset: the form converts its datetime-local value (Asia/Ho_Chi_Minh) before calling.
    scheduledAt: z
      .string({ required_error: TIME_ERROR, invalid_type_error: TIME_ERROR })
      .datetime({ offset: true, message: TIME_ERROR })
      .refine((at) => {
        const ms = Date.parse(at) - Date.now();
        return ms > 0 && ms <= MAX_INTERVIEW_DAYS_AHEAD * DAY_MS;
      }, WINDOW_ERROR),
    durationMinutes: z
      .number({ required_error: DURATION_ERROR, invalid_type_error: DURATION_ERROR })
      .int(DURATION_ERROR)
      .min(15, DURATION_ERROR)
      .max(240, DURATION_ERROR),
    mode: z.enum(['ONLINE', 'ONSITE'], { errorMap: () => ({ message: 'Hình thức phỏng vấn không hợp lệ' }) }),
    location: z.string({ required_error: 'Vui lòng nhập link hoặc địa chỉ phỏng vấn' }).trim(),
    note: optionalText(1000, 'Ghi chú tối đa 1000 ký tự'),
  })
  .superRefine((v, ctx) => {
    const ok =
      v.mode === 'ONLINE'
        ? /^https?:\/\/\S+$/i.test(v.location) && v.location.length <= 500
        : v.location.length >= 5 && v.location.length <= 300;
    if (!ok) ctx.addIssue({ code: 'custom', path: ['location'], message: v.mode === 'ONLINE' ? URL_ERROR : ADDRESS_ERROR });
  });

export const respondInterviewSchema = z
  .object({
    interviewId: interviewIdSchema,
    response: z.enum(['CONFIRM', 'DECLINE', 'RESCHEDULE'], { errorMap: () => ({ message: 'Phản hồi không hợp lệ' }) }),
    note: optionalText(500, 'Ghi chú tối đa 500 ký tự'),
  })
  .refine((v) => v.response !== 'RESCHEDULE' || v.note, { path: ['note'], message: 'Vui lòng ghi chú giờ bạn muốn đổi' });

export const cancelInterviewSchema = z.object({
  interviewId: interviewIdSchema,
  reason: optionalText(500, 'Lý do hủy tối đa 500 ký tự'),
});

export const markInterviewDoneSchema = z.object({ interviewId: interviewIdSchema });

export const interviewScopeSchema = z.enum(['upcoming', 'past']).default('upcoming');
