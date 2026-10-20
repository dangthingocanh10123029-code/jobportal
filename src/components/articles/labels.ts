import type { ArticleCategory } from '@/actions/types';

export const articleCategoryLabels: Record<ArticleCategory, string> = {
  CV: 'CV và hồ sơ',
  INTERVIEW: 'Phỏng vấn',
  SALARY: 'Lương và đãi ngộ',
  CAREER: 'Phát triển sự nghiệp',
  WORKPLACE: 'Môi trường làm việc',
};

export function formatArticleDate(value: string | null): string {
  return value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value)) : 'Chưa xuất bản';
}
