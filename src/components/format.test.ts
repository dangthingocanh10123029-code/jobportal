import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime, formatPostedAgo, shortCompanyName } from './format';

describe('formatPostedAgo', () => {
  const now = Date.parse('2026-10-20T12:00:00Z');
  const ago = (ms: number) => new Date(now - ms).toISOString();

  it('counts minutes, hours, then days, then shows the date', () => {
    expect(formatPostedAgo(ago(20_000), now)).toBe('Vừa đăng');
    expect(formatPostedAgo(ago(5 * 60_000), now)).toBe('Đăng 5 phút trước');
    expect(formatPostedAgo(ago(2 * 3_600_000 + 59 * 60_000), now)).toBe('Đăng 2 giờ trước');
    expect(formatPostedAgo(ago(3 * 86_400_000), now)).toBe('Đăng 3 ngày trước');
    expect(formatPostedAgo(ago(10 * 86_400_000), now)).toBe('Đăng 10/10/2026');
  });

  it('treats a clock skew into the future as just posted', () => {
    expect(formatPostedAgo(ago(-60_000), now)).toBe('Vừa đăng');
  });
});

describe('formatDate / formatDateTime', () => {
  it('always prints Vietnam time, whatever the runtime zone (server UTC vs browser)', () => {
    expect(formatDateTime('2026-10-20T17:30:00Z')).toBe('00:30 21/10/2026');
    expect(formatDate('2026-10-20T17:30:00Z')).toBe('21/10/2026');
  });
});

describe('shortCompanyName', () => {
  it('drops the legal-form prefix only', () => {
    expect(shortCompanyName('Công ty TNHH Bao bì Cánh Diều')).toBe('Bao bì Cánh Diều');
    expect(shortCompanyName('Công ty Cổ phần Công nghệ Mây Bạc')).toBe('Công nghệ Mây Bạc');
    expect(shortCompanyName('Công ty Tài chính Tiêu dùng Ống Heo')).toBe('Tài chính Tiêu dùng Ống Heo');
    expect(shortCompanyName('Mây Bạc Studio')).toBe('Mây Bạc Studio');
    expect(shortCompanyName('Công ty')).toBe('Công ty');
  });
});
