import { describe, expect, it } from 'vitest';
import { formatInterviewTime, vietnamLocalNow, vietnamLocalToIso } from './labels';

describe('interview time helpers', () => {
  it('reads datetime-local input as Vietnam time', () => {
    expect(vietnamLocalToIso('2026-10-21T09:30')).toBe('2026-10-21T09:30:00+07:00');
    expect(Date.parse(vietnamLocalToIso('2026-10-21T09:30'))).toBe(Date.parse('2026-10-21T02:30:00Z'));
  });

  it('round-trips now through the Vietnam clock', () => {
    expect(vietnamLocalNow(Date.parse('2026-10-20T20:15:00Z'))).toBe('2026-10-21T03:15');
  });

  it('formats start and end in Asia/Ho_Chi_Minh', () => {
    expect(formatInterviewTime('2026-10-21T02:30:00Z', 45).time).toBe('09:30 – 10:15');
  });
});
