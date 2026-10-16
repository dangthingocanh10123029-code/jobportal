'use server';

import type { AuthError } from '@supabase/supabase-js';
import { cache } from 'react';
import { createSupabaseServerClient, fetchProfile, PROFILE_COLUMNS, toProfile } from '@/lib/supabase-server';
import { firstError, signInSchema, signUpSchema, updateProfileSchema } from './auth-schema';
import type { ActionResult, Profile, Role } from './types';

const fail = (error: string) => ({ success: false, error }) as const;

const AUTH_ERRORS: Record<string, string> = {
  user_already_exists: 'Email này đã được đăng ký',
  email_exists: 'Email này đã được đăng ký',
  invalid_credentials: 'Email hoặc mật khẩu không đúng',
  email_not_confirmed: 'Email chưa được xác nhận, vui lòng kiểm tra hộp thư',
  weak_password: 'Mật khẩu quá yếu',
  over_request_rate_limit: 'Bạn thao tác quá nhanh, vui lòng thử lại sau',
};

function authError(error: AuthError): string {
  return (error.code && AUTH_ERRORS[error.code]) || 'Có lỗi xảy ra, vui lòng thử lại';
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
    options: { data: { role: profile.role, full_name: profile.fullName, company_name: companyName } },
  });
  if (error) return fail(authError(error));
  if (!data.user) return fail('Có lỗi xảy ra, vui lòng thử lại');

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

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return fail('Bạn cần đăng nhập');
  const current = await fetchProfile(supabase, auth.user.id);
  if (!current) return fail('Không tìm thấy hồ sơ tài khoản');

  const { fullName, phone, companyName } = parsed.data;
  const changes = {
    ...(fullName !== undefined && { full_name: fullName }),
    ...(phone !== undefined && { phone }),
    // Only Employers have a company name.
    ...(companyName !== undefined && current.role === 'EMPLOYER' && { company_name: companyName }),
  };
  if (Object.keys(changes).length === 0) return { success: true, data: current };

  const { data, error } = await supabase
    .from('profiles')
    .update(changes)
    .eq('id', current.userId)
    .select(PROFILE_COLUMNS)
    .single();
  if (error) return fail('Không cập nhật được hồ sơ, vui lòng thử lại');
  return { success: true, data: toProfile(data) };
}

// cache(): the header (layout) and the page share one lookup per request.
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  return data.user ? fetchProfile(supabase, data.user.id) : null;
});
