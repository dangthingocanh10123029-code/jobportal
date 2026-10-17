import { describe, expect, it } from 'vitest';
import { allowedNextStatuses } from './application-status';

// Spec "Application Status state machine": Employer makes every transition except WITHDRAWN; Candidate only WITHDRAWN.
describe('allowedNextStatuses', () => {
  it.each([
    ['SUBMITTED', ['REVIEWING', 'REJECTED'], ['WITHDRAWN']],
    ['REVIEWING', ['INTERVIEWING', 'REJECTED'], ['WITHDRAWN']],
    ['INTERVIEWING', ['OFFERED', 'REJECTED'], ['WITHDRAWN']],
    ['OFFERED', ['HIRED', 'REJECTED'], ['WITHDRAWN']],
    ['HIRED', [], []],
    ['REJECTED', [], []],
    ['WITHDRAWN', [], []],
  ] as const)('%s → Employer %j, Candidate %j', (status, employer, candidate) => {
    expect(allowedNextStatuses(status, 'EMPLOYER')).toEqual(employer);
    expect(allowedNextStatuses(status, 'CANDIDATE')).toEqual(candidate);
  });
});
