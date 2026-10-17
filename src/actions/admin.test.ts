import { describe, expect, it } from 'vitest';
import {
  getAdminUser,
  setCompanyVerifiedAction,
  setPostingHiddenAction,
  setUserLockAction,
} from './admin';
import {
  adminCompanyFilterSchema,
  adminPostingFilterSchema,
  adminUserFilterSchema,
  auditFilterSchema,
  setPostingHiddenSchema,
  setUserLockSchema,
  toQuery,
} from './admin-schema';

const ID = '00000000-0000-4000-8000-000000000001';
const REASON = 'Lý do cần từ 5 đến 500 ký tự';

// Invalid input is rejected before any API call, so no env/session is needed here.
describe('admin actions — input sai', () => {
  it.each([
    ['khóa không có lý do', () => setUserLockAction({ userId: ID, locked: true }), REASON],
    ['khóa lý do < 5 ký tự (sau khi cắt)', () => setUserLockAction({ userId: ID, locked: true, reason: '  abcd ' }), REASON],
    ['khóa lý do > 500 ký tự', () => setUserLockAction({ userId: ID, locked: true, reason: 'x'.repeat(501) }), REASON],
    ['khóa user id sai', () => setUserLockAction({ userId: 'abc', locked: true, reason: 'Spam tin' }), 'Mã người dùng không hợp lệ'],
    ['locked không phải boolean', () => setUserLockAction({ userId: ID, locked: 'yes' as never }), 'Dữ liệu không hợp lệ'],
    ['ẩn tin không có lý do', () => setPostingHiddenAction({ postingId: ID, hidden: true }), REASON],
    ['ẩn tin id sai', () => setPostingHiddenAction({ postingId: '1', hidden: false }), 'Mã tin không hợp lệ'],
    ['xác minh công ty id sai', () => setCompanyVerifiedAction({ companyId: 'x', verified: true }), 'Mã công ty không hợp lệ'],
    ['verified thiếu', () => setCompanyVerifiedAction({ companyId: ID } as never), 'Dữ liệu không hợp lệ'],
  ])('%s', async (_, call, error) => {
    expect(await call()).toEqual({ success: false, error });
  });

  it('getAdminUser id không phải uuid → null', async () => {
    expect(await getAdminUser('abc')).toBeNull();
  });
});

describe('schema khóa / ẩn', () => {
  it('cắt khoảng trắng lý do; mở khóa / bỏ ẩn bỏ qua lý do', () => {
    expect(setUserLockSchema.parse({ userId: ID, locked: true, reason: '  Spam tin  ' })).toEqual({ userId: ID, locked: true, reason: 'Spam tin' });
    expect(setUserLockSchema.parse({ userId: ID, locked: false, reason: 'x' })).toEqual({ userId: ID, locked: false });
    expect(setPostingHiddenSchema.parse({ postingId: ID, hidden: false })).toEqual({ postingId: ID, hidden: false });
  });
});

describe('bộ lọc từ URL: rác → bỏ qua, không lỗi', () => {
  it('users', () => {
    expect(adminUserFilterSchema.parse({ q: ' an ', role: 'ADMIN', locked: 'true', page: '2' })).toEqual({ q: 'an', role: 'ADMIN', locked: true, page: 2 });
    expect(adminUserFilterSchema.parse({ q: '  ', role: 'ROOT', locked: 'maybe', page: -1 })).toEqual({ q: undefined, role: undefined, locked: undefined, page: 1 });
    expect(adminUserFilterSchema.parse('rác')).toEqual({ page: 1 });
  });

  it('postings, companies, audit', () => {
    expect(adminPostingFilterSchema.parse({ status: 'EXPIRED', hidden: false, employerId: 'x' })).toMatchObject({ status: 'EXPIRED', hidden: false, employerId: undefined, page: 1 });
    expect(adminCompanyFilterSchema.parse({ verified: 'false' })).toMatchObject({ verified: false });
    expect(auditFilterSchema.parse({ action: 'DROP_TABLE', actorId: ID })).toMatchObject({ action: undefined, actorId: ID });
  });

  it('toQuery bỏ trường undefined, giữ false', () => {
    expect(toQuery({ q: undefined, locked: false, page: 1 })).toBe('locked=false&page=1');
    expect(toQuery({ q: 'a&b=c', page: 2 })).toBe('q=a%26b%3Dc&page=2');
  });
});
