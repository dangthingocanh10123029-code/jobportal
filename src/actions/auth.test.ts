import { fromPartial } from '@total-typescript/shoehorn';
import { describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { signInAction, signUpAction, updateProfileAction } from './auth';
import { signUpSchema, updateProfileSchema } from './auth-schema';

// Invalid input is rejected before any Supabase call, so no env/session is needed here.
describe('signUpAction — input sai', () => {
  const base = { email: 'a@example.com', password: '12345678' };

  it.each([
    ['email sai', { ...base, email: 'khong-phai-email', role: 'CANDIDATE', fullName: 'An' }, 'Email không hợp lệ'],
    ['mật khẩu < 8 ký tự', { ...base, password: '1234567', role: 'CANDIDATE', fullName: 'An' }, 'Mật khẩu tối thiểu 8 ký tự'],
    ['role lạ', { ...base, role: 'ADMIN', fullName: 'An' }, 'Vui lòng chọn vai trò Candidate hoặc Employer'],
    ['Candidate thiếu họ tên', { ...base, role: 'CANDIDATE' }, 'Vui lòng nhập họ tên'],
    ['Candidate họ tên toàn khoảng trắng', { ...base, role: 'CANDIDATE', fullName: '   ' }, 'Vui lòng nhập họ tên'],
    ['Employer thiếu tên công ty', { ...base, role: 'EMPLOYER', fullName: 'An' }, 'Vui lòng nhập tên công ty'],
  ])('%s', async (_, input, error) => {
    expect(await signUpAction(input as never)).toEqual({ success: false, error });
  });
});

describe('signInAction — input sai', () => {
  it('thiếu mật khẩu', async () => {
    expect(await signInAction({ email: 'a@example.com', password: '' })).toEqual({
      success: false,
      error: 'Vui lòng nhập mật khẩu',
    });
  });
});

describe('updateProfileAction — input sai', () => {
  it.each([
    ['SĐT sai định dạng', { phone: 'abc' }],
    ['họ tên rỗng', { fullName: ' ' }],
    ['tên công ty quá dài', { companyName: 'x'.repeat(151) }],
  ])('%s', async (_, input) => {
    expect((await updateProfileAction(input)).success).toBe(false);
  });
});

describe('schema — input hợp lệ', () => {
  it('trim và giữ đúng trường theo role', () => {
    expect(
      signUpSchema.parse({ email: ' A@Example.com ', password: '12345678', role: 'EMPLOYER', companyName: ' ACME ' }),
    ).toEqual({ email: 'a@example.com', password: '12345678', role: 'EMPLOYER', companyName: 'ACME' });
  });

  it('SĐT rỗng nghĩa là xoá số', () => {
    expect(updateProfileSchema.parse({ phone: '' })).toEqual({ phone: null });
    expect(updateProfileSchema.parse({ phone: '0912 345 678' })).toEqual({ phone: '0912 345 678' });
  });
});

vi.mock('@/lib/supabase-server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/supabase-server')>()),
  createSupabaseServerClient: vi.fn(),
}));

describe('signUpAction — needsEmailConfirmation', () => {
  it.each([
    ['chưa có session (bật xác nhận email) → true', null, true],
    ['có session → false', { access_token: 't' }, false],
  ])('%s', async (_, session, needsEmailConfirmation) => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      fromPartial({ auth: { signUp: async () => ({ data: { user: { id: 'u1' }, session }, error: null }) } }),
    );
    const result = await signUpAction({ email: 'a@example.com', password: '12345678', role: 'CANDIDATE', fullName: 'An' });
    expect(result).toEqual({
      success: true,
      data: { userId: 'u1', role: 'CANDIDATE', fullName: 'An', phone: null, companyName: null, needsEmailConfirmation },
    });
  });
});

describe('signUpAction — lỗi GoTrue', () => {
  const signUpWith = (error: object) =>
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      fromPartial({ auth: { signUp: async () => ({ data: { user: null, session: null }, error }) } }),
    );
  const input = { email: 'a@example.com', password: '12345678', role: 'CANDIDATE', fullName: 'An' } as const;

  it.each([
    ['email_address_not_authorized', 'Hệ thống chưa gửi được email xác nhận tới địa chỉ này, vui lòng liên hệ quản trị'],
    ['over_email_send_rate_limit', 'Đã gửi quá nhiều email xác nhận, vui lòng thử lại sau ít phút'],
    ['email_address_invalid', 'Email không hợp lệ'],
    ['signup_disabled', 'Hệ thống đang tạm khóa đăng ký'],
    ['unexpected_failure', 'Không tạo được tài khoản, vui lòng thử lại'],
  ])('%s', async (code, error) => {
    signUpWith({ code, status: 400, message: code });
    expect(await signUpAction(input)).toEqual({ success: false, error });
  });

  it('mã lạ → thông báo chung và log nguyên nhân', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    signUpWith({ code: 'weird_code', status: 500, message: 'boom' });
    expect(await signUpAction(input)).toEqual({ success: false, error: 'Có lỗi xảy ra, vui lòng thử lại' });
    expect(log).toHaveBeenCalledWith('[auth]', 'weird_code', 500, 'boom');
    log.mockRestore();
  });
});
