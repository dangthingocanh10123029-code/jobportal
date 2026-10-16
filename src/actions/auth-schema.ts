import { z } from 'zod';

// Kept in sync with the CHECK constraints in supabase/migrations/*_profiles.sql.
const fullName = z.string({ required_error: 'Vui lòng nhập họ tên' }).trim().min(1, 'Vui lòng nhập họ tên').max(100, 'Họ tên tối đa 100 ký tự');
const companyName = z
  .string({ required_error: 'Vui lòng nhập tên công ty' })
  .trim()
  .min(1, 'Vui lòng nhập tên công ty')
  .max(150, 'Tên công ty tối đa 150 ký tự');
const phone = z
  .string()
  .trim()
  .regex(/^\+?[0-9 .-]{8,20}$/, 'Số điện thoại không hợp lệ');

const credentials = {
  email: z.string({ required_error: 'Vui lòng nhập email' }).trim().toLowerCase().email('Email không hợp lệ'),
  password: z.string({ required_error: 'Vui lòng nhập mật khẩu' }).min(8, 'Mật khẩu tối thiểu 8 ký tự').max(72, 'Mật khẩu tối đa 72 ký tự'),
};

export const signUpSchema = z.discriminatedUnion(
  'role',
  [
    z.object({ ...credentials, role: z.literal('CANDIDATE'), fullName }),
    z.object({ ...credentials, role: z.literal('EMPLOYER'), companyName, fullName: fullName.optional() }),
  ],
  { errorMap: () => ({ message: 'Vui lòng chọn vai trò Candidate hoặc Employer' }) },
);

export const signInSchema = z.object({
  email: credentials.email,
  password: z.string({ required_error: 'Vui lòng nhập mật khẩu' }).min(1, 'Vui lòng nhập mật khẩu'),
});

export const updateProfileSchema = z.object({
  fullName: fullName.optional(),
  // Empty string clears the phone number.
  phone: z.union([z.literal('').transform(() => null), phone]).optional(),
  companyName: companyName.optional(),
});

export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Dữ liệu không hợp lệ';
}
