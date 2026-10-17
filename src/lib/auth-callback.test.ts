import { describe, expect, it } from 'vitest';
import { safeNext } from './auth-callback';

describe('safeNext', () => {
  it('giữ đường dẫn nội bộ kèm query', () => {
    expect(safeNext('/jobs/1?x=1#a')).toBe('/jobs/1?x=1#a');
    expect(safeNext('/employer/postings')).toBe('/employer/postings');
  });

  it.each([null, '', 'account', 'https://evil.com', '//evil.com', '/\\evil.com', '/\t/evil.com', 'javascript:alert(1)'])(
    'chặn %j → /account',
    (next) => expect(safeNext(next)).toBe('/account'),
  );
});
