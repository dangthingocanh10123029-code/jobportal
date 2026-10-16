import { describe, expect, it } from 'vitest';
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
