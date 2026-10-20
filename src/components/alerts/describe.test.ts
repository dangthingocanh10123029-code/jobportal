import { describe, expect, it } from 'vitest';
import { alertFilterFromSearch, alertSearchHref, describeAlertFilter } from './describe';

describe('job alert filter helpers', () => {
  it('keeps only alert conditions that were set', () => {
    expect(alertFilterFromSearch({ q: 'kế toán', location: '', skill: 'Excel', sort: 'newest', maxExperience: 2, page: 1, level: 'JUNIOR' }))
      .toEqual({ q: 'kế toán', level: 'JUNIOR' });
  });

  it('describes a filter in Vietnamese', () => {
    expect(describeAlertFilter({ q: 'kế toán', location: 'Hà Nội', employmentType: 'FULL_TIME', minSalary: 10000000 }))
      .toBe('Từ khóa “kế toán” · Tại Hà Nội · Toàn thời gian · Lương từ 10.000.000 ₫ / tháng');
    expect(describeAlertFilter({ industry: 'IT_SOFTWARE' })).toBe('Ngành Công nghệ thông tin');
  });

  it('links back to the search form with the same query keys', () => {
    expect(alertSearchHref({ q: 'a b', employmentType: 'PART_TIME', minSalary: 5 })).toBe('/?q=a+b&type=PART_TIME&minSalary=5#job-search');
  });
});
