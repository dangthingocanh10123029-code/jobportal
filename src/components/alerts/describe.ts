import type { AlertFilter, SearchFilter } from '@/actions/types';
import { employmentLabels, industryLabels, jobLevelLabels } from '@/components/format';

/** The search conditions a job alert can store; experience, skill and sort are not part of an alert. */
export function alertFilterFromSearch(filter: SearchFilter): AlertFilter {
  const { q, location, employmentType, industry, level, minSalary } = filter;
  return Object.fromEntries(Object.entries({ q, location, employmentType, industry, level, minSalary }).filter(([, v]) => v !== undefined && v !== '')) as AlertFilter;
}

export function describeAlertFilter(filter: AlertFilter): string {
  return [
    filter.q ? `Từ khóa “${filter.q}”` : null,
    filter.location ? `Tại ${filter.location}` : null,
    filter.employmentType ? employmentLabels[filter.employmentType] : null,
    filter.industry ? `Ngành ${industryLabels[filter.industry]}` : null,
    filter.level ? `Cấp bậc ${jobLevelLabels[filter.level]}` : null,
    filter.minSalary ? `Lương từ ${new Intl.NumberFormat('vi-VN').format(filter.minSalary)} ₫ / tháng` : null,
  ].filter(Boolean).join(' · ') || 'Mọi việc làm';
}

/** Home search URL showing the alert's current results (same query keys as the search form). */
export function alertSearchHref(filter: AlertFilter): string {
  const params = new URLSearchParams();
  if (filter.q) params.set('q', filter.q);
  if (filter.location) params.set('location', filter.location);
  if (filter.employmentType) params.set('type', filter.employmentType);
  if (filter.industry) params.set('industry', filter.industry);
  if (filter.level) params.set('level', filter.level);
  if (filter.minSalary) params.set('minSalary', String(filter.minSalary));
  return `/?${params.toString()}#job-search`;
}
