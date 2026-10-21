import { describe, expect, it } from 'vitest';
import { JOB_TITLES, PROVINCES } from './suggestions';

describe('suggestion lists', () => {
  it('has the 63 provinces plus Remote, no duplicates', () => {
    expect(PROVINCES).toHaveLength(64);
    expect(new Set(PROVINCES).size).toBe(64);
  });
  it('has no duplicate job titles', () => {
    expect(new Set(JOB_TITLES).size).toBe(JOB_TITLES.length);
  });
});
