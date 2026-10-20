import { describe, expect, it } from 'vitest';
import { avatarFor } from './avatar';

describe('avatarFor', () => {
  it('returns the same avatar for the same id', () => {
    expect(avatarFor('7b1c2d3e-0000-4000-8000-000000000001')).toBe(avatarFor('7b1c2d3e-0000-4000-8000-000000000001'));
  });

  it('always points to one of avatar-01..12', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 500; i += 1) {
      const src = avatarFor(`user-${i}-${'x'.repeat(i % 40)}`);
      expect(src).toMatch(/^\/images\/avatars\/avatar-(0[1-9]|1[0-2])\.svg$/);
      seen.add(src);
    }
    expect(avatarFor('')).toMatch(/avatar-01\.svg$/);
    expect(seen.size).toBe(12);
  });
});
