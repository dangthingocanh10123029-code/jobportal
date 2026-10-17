import { fromPartial } from '@total-typescript/shoehorn';
import { describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { resendSignupOtpAction, signInAction, signUpAction, updateProfileAction, verifySignupOtpAction } from './auth';
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

describe('OTP — input sai', () => {
  it.each([
    ['email sai', { email: 'x', token: '123456' }, 'Email không hợp lệ'],
    ['mã quá ngắn', { email: 'a@example.com', token: '12345' }, 'Mã xác nhận gồm 6–10 chữ số'],
    ['mã quá dài', { email: 'a@example.com', token: '12345678901' }, 'Mã xác nhận gồm 6–10 chữ số'],
    ['mã có chữ', { email: 'a@example.com', token: '12a456' }, 'Mã xác nhận gồm 6–10 chữ số'],
  ])('verify: %s', async (_, input, error) => {
    expect(await verifySignupOtpAction(input)).toEqual({ success: false, error });
  });

  it('resend: email sai', async () => {
    expect(await resendSignupOtpAction({ email: 'x' })).toEqual({ success: false, error: 'Email không hợp lệ' });
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

vi.mock('next/headers', () => ({ headers: async () => new Headers({ origin: 'https://jobs.example' }) }));

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

  it('gửi emailRedirectTo về /auth/callback của origin', async () => {
    const signUp = vi.fn(async () => ({ data: { user: { id: 'u1' }, session: null }, error: null }));
    vi.mocked(createSupabaseServerClient).mockResolvedValue(fromPartial({ auth: { signUp } }));
    await signUpAction({ email: 'a@example.com', password: '12345678', role: 'CANDIDATE', fullName: 'An' });
    expect(signUp).toHaveBeenCalledWith(
      expect.objectContaining({ options: expect.objectContaining({ emailRedirectTo: 'https://jobs.example/auth/callback' }) }),
    );
  });

  it('email đã tồn tại (identities rỗng) → báo đăng nhập', async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      fromPartial({ auth: { signUp: async () => ({ data: { user: { id: 'u1', identities: [] }, session: null }, error: null }) } }),
    );
    const result = await signUpAction({ email: 'a@example.com', password: '12345678', role: 'CANDIDATE', fullName: 'An' });
    expect(result).toEqual({ success: false, error: 'Email này đã được đăng ký, vui lòng đăng nhập' });
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

describe('OTP — gọi Supabase', () => {
  it('verify: dùng type email, chuẩn hoá input, trả Profile', async () => {
    const verifyOtp = vi.fn(async () => ({ data: { user: { id: 'u1' } }, error: null }));
    const row = { id: 'u1', role: 'CANDIDATE', full_name: 'An', phone: null, company_name: null };
    const query = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: row, error: null }) };
    vi.mocked(createSupabaseServerClient).mockResolvedValue(fromPartial({ auth: { verifyOtp }, from: () => query }));

    expect(await verifySignupOtpAction({ email: ' A@Example.com ', token: ' 123456 ' })).toEqual({
      success: true,
      data: { userId: 'u1', role: 'CANDIDATE', fullName: 'An', phone: null, companyName: null },
    });
    expect(verifyOtp).toHaveBeenCalledWith({ email: 'a@example.com', token: '123456', type: 'email' });
  });

  it('verify: otp_expired → tiếng Việt', async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      fromPartial({ auth: { verifyOtp: async () => ({ data: { user: null }, error: { code: 'otp_expired', status: 403 } }) } }),
    );
    expect(await verifySignupOtpAction({ email: 'a@example.com', token: '123456' })).toEqual({
      success: false,
      error: 'Mã xác nhận không đúng hoặc đã hết hạn',
    });
  });

  it.each([
    ['ok', null, { success: true, data: null }],
    ['over_email_send_rate_limit', { code: 'over_email_send_rate_limit' }, { success: false, error: 'Đã gửi quá nhiều email xác nhận, vui lòng thử lại sau ít phút' }],
    ['over_request_rate_limit', { code: 'over_request_rate_limit' }, { success: false, error: 'Bạn thao tác quá nhanh, vui lòng thử lại sau' }],
  ])('resend: %s', async (_, error, expected) => {
    const resend = vi.fn(async () => ({ data: {}, error }));
    vi.mocked(createSupabaseServerClient).mockResolvedValue(fromPartial({ auth: { resend } }));
    expect(await resendSignupOtpAction({ email: 'a@example.com' })).toEqual(expected);
    expect(resend).toHaveBeenCalledWith({
      type: 'signup',
      email: 'a@example.com',
      options: { emailRedirectTo: 'https://jobs.example/auth/callback' },
    });
  });
});
