import type { ApplicationStatus, CompanySize, DisplayPostingStatus, EmploymentType, Industry, JobLevel, PostingSort } from '@/actions/types';

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

export const companySizeLabels: Record<CompanySize, string> = {
  S1_10: '1–10 nhân viên',
  S11_50: '11–50 nhân viên',
  S51_200: '51–200 nhân viên',
  S201_500: '201–500 nhân viên',
  S500_PLUS: 'Trên 500 nhân viên',
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

/** "Đăng 2 giờ trước"; older than a week falls back to the date. */
export function formatPostedAgo(createdAt: string, now = Date.now()) {
  const minutes = Math.max(0, Math.floor((now - new Date(createdAt).getTime()) / 60_000));
  if (minutes < 60) return minutes < 1 ? 'Vừa đăng' : `Đăng ${minutes} phút trước`;
  if (minutes < 24 * 60) return `Đăng ${Math.floor(minutes / 60)} giờ trước`;
  const days = Math.floor(minutes / (24 * 60));
  return days <= 7 ? `Đăng ${days} ngày trước` : `Đăng ${formatDate(createdAt)}`;
}
