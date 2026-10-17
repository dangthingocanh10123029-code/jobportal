'use server';

import type { AuthError } from '@supabase/supabase-js';
import { headers } from 'next/headers';
import { cache } from 'react';
import { apiFetch } from '@/lib/api';
import { createSupabaseServerClient, fetchProfile } from '@/lib/supabase-server';
import {
  firstError,
  resendSignupOtpSchema,
  signInSchema,
  signUpSchema,
  updateProfileSchema,
  verifySignupOtpSchema,
} from './auth-schema';
import { fail, toAction } from './_shared';
import type { ActionResult, Profile, Role } from './types';

const AUTH_ERRORS: Record<string, string> = {
  user_already_exists: 'Email này đã được đăng ký',
  email_exists: 'Email này đã được đăng ký',
  invalid_credentials: 'Email hoặc mật khẩu không đúng',
  // No reason here: anyone can try any email (contract §32); the reason shows only to the account's own token.
  user_banned: 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.',
  email_not_confirmed: 'Email chưa được xác nhận, vui lòng kiểm tra hộp thư',
  weak_password: 'Mật khẩu quá yếu',
  over_request_rate_limit: 'Bạn thao tác quá nhanh, vui lòng thử lại sau',
  email_address_not_authorized: 'Hệ thống chưa gửi được email xác nhận tới địa chỉ này, vui lòng liên hệ quản trị',
  over_email_send_rate_limit: 'Đã gửi quá nhiều email xác nhận, vui lòng thử lại sau ít phút',
  email_address_invalid: 'Email không hợp lệ',
  signup_disabled: 'Hệ thống đang tạm khóa đăng ký',
  otp_expired: 'Mã xác nhận không đúng hoặc đã hết hạn',
  unexpected_failure: 'Không tạo được tài khoản, vui lòng thử lại',
};

function authError(error: AuthError): string {
  const mapped = error.code && AUTH_ERRORS[error.code];
  if (mapped) return mapped;
  // Unmapped GoTrue code: log it so the real cause shows up in server logs.
  console.error('[auth]', error.code, error.status, error.message);
  return 'Có lỗi xảy ra, vui lòng thử lại';
}

// Where the "Confirm email" link lands (src/app/auth/callback/route.ts), on the host the user is browsing.
async function emailRedirectTo(): Promise<string> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const origin =
    h.get('origin') ?? (host ? `${h.get('x-forwarded-proto') ?? 'https'}://${host}` : process.env.NEXT_PUBLIC_SITE_URL);
  return `${origin ?? ''}/auth/callback`;
}

export async function signUpAction(input: {
  email: string;
  password: string;
  role: Role;
  fullName?: string;
  companyName?: string;
}): Promise<ActionResult<Profile & { needsEmailConfirmation: boolean }>> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error));
  const { email, password, ...profile } = parsed.data;
  const companyName = profile.role === 'EMPLOYER' ? profile.companyName : null;

  const supabase = await createSupabaseServerClient();
  // The profiles row is created by the on_auth_user_created trigger from this metadata.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: await emailRedirectTo(),
      data: { role: profile.role, full_name: profile.fullName, company_name: companyName },
    },
  });
  if (error) return fail(authError(error));
  if (!data.user) return fail('Có lỗi xảy ra, vui lòng thử lại');
  // GoTrue hides existing emails (confirm email on): 200 with a fake user that has no identities and sends no mail.
  if (data.user.identities?.length === 0) return fail('Email này đã được đăng ký, vui lòng đăng nhập');

  // With email confirmation on there is no session yet, so RLS hides the row: answer from the input.
  return {
    success: true,
    data: {
      userId: data.user.id,
      role: profile.role,
      fullName: profile.fullName ?? null,
      phone: null,
      companyName,
      needsEmailConfirmation: data.session === null,
    },
  };
}

export async function signInAction(input: { email: string; password: string }): Promise<ActionResult<Profile>> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error));

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return fail(authError(error));

  const profile = await fetchProfile(supabase, data.user.id);
  if (!profile) return fail('Không tìm thấy hồ sơ tài khoản');
  return { success: true, data: profile };
}

export async function verifySignupOtpAction(input: { email: string; token: string }): Promise<ActionResult<Profile>> {
  const parsed = verifySignupOtpSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error));

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.verifyOtp({ ...parsed.data, type: 'email' });
  if (error) return fail(authError(error));
  if (!data.user) return fail('Có lỗi xảy ra, vui lòng thử lại');

  const profile = await fetchProfile(supabase, data.user.id);
  if (!profile) return fail('Không tìm thấy hồ sơ tài khoản');
  return { success: true, data: profile };
}

export async function resendSignupOtpAction(input: { email: string }): Promise<ActionResult<null>> {
  const parsed = resendSignupOtpSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error));

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: parsed.data.email,
    options: { emailRedirectTo: await emailRedirectTo() },
  });
  if (error) return fail(authError(error));
  return { success: true, data: null };
}

export async function signOutAction(): Promise<ActionResult<null>> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();
  if (error) return fail(authError(error));
  return { success: true, data: null };
}

export async function updateProfileAction(input: {
  fullName?: string;
  phone?: string;
  companyName?: string;
}): Promise<ActionResult<Profile>> {
  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error));
  // FastAPI ignores companyName for Candidates.
  return toAction(await apiFetch<Profile>('/me/profile', { method: 'PATCH', body: parsed.data }));
}

// cache(): the header (layout) and the page share one lookup per request.
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  // Signed out → no API round trip. getSession reads the cookie; middleware verified it and FastAPI checks the JWT.
  const { data } = await (await createSupabaseServerClient()).auth.getSession();
  if (!data.session) return null;
  const res = await apiFetch<Profile>('/me/profile');
  if (res.ok) return res.data;
  if (res.status === 401 || res.status === 404) return null;
  throw new Error(`Không đọc được profile: ${res.error}`);
});
