import { describe, expect, it } from 'vitest';
import { isCurrent } from './header-nav';

describe('isCurrent', () => {
  const salary = new URLSearchParams('category=SALARY');
  it('lights a query link only when its params match', () => {
    expect(isCurrent('/guide', salary, '/guide?category=SALARY')).toBe(true);
    expect(isCurrent('/guide', new URLSearchParams(), '/guide?category=SALARY')).toBe(false);
    expect(isCurrent('/guide', null, '/guide?category=SALARY')).toBe(false);
  });
  it('matches plain links by path and sub-path', () => {
    expect(isCurrent('/guide/cv-tips', null, '/guide')).toBe(true);
    expect(isCurrent('/companies', null, '/')).toBe(false);
  });
});
