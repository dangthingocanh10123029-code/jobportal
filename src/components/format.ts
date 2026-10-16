import type { ApplicationStatus, DisplayPostingStatus, EmploymentType } from '@/actions/types';

export const applicationStatusLabels: Record<ApplicationStatus, string> = {
  SUBMITTED: 'Đã nộp',
  REVIEWING: 'Đang xem xét',
  INTERVIEWING: 'Phỏng vấn',
  OFFERED: 'Đã gửi đề nghị',
  HIRED: 'Đã tuyển dụng',
  REJECTED: 'Không phù hợp',
  WITHDRAWN: 'Đã rút hồ sơ',
};

export const postingStatusLabels: Record<DisplayPostingStatus, string> = {
  DRAFT: 'Bản nháp',
  PUBLISHED: 'Đang đăng',
  CLOSED: 'Đã đóng',
  EXPIRED: 'Hết hạn',
};

export const employmentLabels: Record<EmploymentType, string> = {
  FULL_TIME: 'Toàn thời gian',
  PART_TIME: 'Bán thời gian',
  INTERNSHIP: 'Thực tập',
  CONTRACT: 'Hợp đồng',
};

export function formatSalary(salaryMin: number | null, salaryMax: number | null) {
  if (salaryMin === null && salaryMax === null) return 'Thỏa thuận';
  const amount = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value)} ₫`;
  if (salaryMin !== null && salaryMax !== null) {
    return `${amount(salaryMin)} – ${amount(salaryMax)} / tháng`;
  }
  if (salaryMin !== null) return `Từ ${amount(salaryMin)} / tháng`;
  return `Đến ${amount(salaryMax!)} / tháng`;
}

export function formatDate(value: string, month: '2-digit' | 'long' = '2-digit') {
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month, year: 'numeric' }).format(new Date(value));
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
