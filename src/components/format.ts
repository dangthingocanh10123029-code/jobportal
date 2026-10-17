import type { ApplicationStatus, DisplayPostingStatus, EmploymentType, Industry, JobLevel, PostingSort } from '@/actions/types';

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

export const industryLabels: Record<Industry, string> = {
  IT_SOFTWARE: 'Công nghệ thông tin',
  SALES: 'Kinh doanh',
  MARKETING: 'Marketing',
  ACCOUNTING_FINANCE: 'Kế toán / Tài chính',
  HR: 'Nhân sự',
  ADMIN: 'Hành chính',
  CUSTOMER_SERVICE: 'Chăm sóc khách hàng',
  EDUCATION: 'Giáo dục',
  HEALTHCARE: 'Y tế',
  CONSTRUCTION: 'Xây dựng',
  MANUFACTURING: 'Sản xuất',
  LOGISTICS: 'Logistics',
  HOSPITALITY: 'Nhà hàng / Khách sạn',
  DESIGN: 'Thiết kế',
  LEGAL: 'Pháp lý',
  OTHER: 'Ngành nghề khác',
};

export const jobLevelLabels: Record<JobLevel, string> = {
  INTERN: 'Thực tập sinh',
  FRESHER: 'Mới tốt nghiệp',
  JUNIOR: 'Nhân viên',
  MIDDLE: 'Chuyên viên',
  SENIOR: 'Cấp cao',
  LEAD: 'Trưởng nhóm',
  MANAGER: 'Quản lý',
};

export const postingSortLabels: Record<PostingSort, string> = {
  newest: 'Mới nhất',
  salary_desc: 'Lương cao nhất',
  deadline_asc: 'Sắp hết hạn',
};

export function formatExperience(years: number) {
  return years === 0 ? 'Không yêu cầu kinh nghiệm' : `${years}+ năm kinh nghiệm`;
}

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
