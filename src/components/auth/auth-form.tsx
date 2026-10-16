'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInAction, signUpAction } from '@/actions/auth';
import type { Role } from '@/actions/types';

type AuthMode = 'login' | 'signup';

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next');
  const isSignup = mode === 'signup';
  const [role, setRole] = useState<Role>('CANDIDATE');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setPending(true);
    setError('');
    setMessage('');

    const result = isSignup
      ? await signUpAction({
          email: String(formData.get('email') ?? ''),
          password: String(formData.get('password') ?? ''),
          role,
          ...(role === 'CANDIDATE' ? { fullName: String(formData.get('fullName') ?? '') } : {}),
          ...(role === 'EMPLOYER' ? { companyName: String(formData.get('companyName') ?? '') } : {}),
        })
      : await signInAction({
          email: String(formData.get('email') ?? ''),
          password: String(formData.get('password') ?? ''),
        });

    setPending(false);
    if (!result.success) {
      setError(result.error);
      return;
    }

    if (isSignup && 'needsEmailConfirmation' in result.data && result.data.needsEmailConfirmation) {
      setMessage('Kiểm tra email để xác nhận tài khoản');
      return;
    }

    const destination = !isSignup && next?.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\')
      ? next
      : isSignup
        ? '/account'
        : '/';
    router.push(destination);
    router.refresh();
  }

  return (
    <form className="form-stack" onSubmit={handleSubmit}>
      {isSignup ? (
        <fieldset className="role-picker">
          <legend>Bạn tham gia với vai trò nào?</legend>
          <label className={`role-option${role === 'CANDIDATE' ? ' selected' : ''}`}>
            <input checked={role === 'CANDIDATE'} name="role" onChange={() => setRole('CANDIDATE')} type="radio" value="CANDIDATE" />
            <span className="role-icon" aria-hidden="true">⌕</span>
            <span><strong>Tôi đang tìm việc</strong><small>Tạo hồ sơ và theo dõi đơn ứng tuyển</small></span>
          </label>
          <label className={`role-option${role === 'EMPLOYER' ? ' selected' : ''}`}>
            <input checked={role === 'EMPLOYER'} name="role" onChange={() => setRole('EMPLOYER')} type="radio" value="EMPLOYER" />
            <span className="role-icon" aria-hidden="true">▣</span>
            <span><strong>Tôi đang tuyển dụng</strong><small>Đăng tin và tìm ứng viên phù hợp</small></span>
          </label>
        </fieldset>
      ) : null}

      {isSignup && role === 'CANDIDATE' ? (
        <label className="field-label">
          Họ và tên
          <input autoComplete="name" className="text-input" name="fullName" placeholder="Nguyễn Minh Anh" required />
        </label>
      ) : null}
      {isSignup && role === 'EMPLOYER' ? (
        <label className="field-label">
          Tên công ty
          <input autoComplete="organization" className="text-input" name="companyName" placeholder="Công ty của bạn" required />
        </label>
      ) : null}
      <label className="field-label">
        Email
        <input autoComplete="email" className="text-input" name="email" placeholder="ban@example.com" required type="email" />
      </label>
      <label className="field-label">
        Mật khẩu
        <input autoComplete={isSignup ? 'new-password' : 'current-password'} className="text-input" minLength={isSignup ? 8 : undefined} name="password" placeholder={isSignup ? 'Ít nhất 8 ký tự' : 'Nhập mật khẩu'} required type="password" />
      </label>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {message ? <p className="form-success" role="status">{message}</p> : null}
      <button className="button button-primary button-wide" disabled={pending} type="submit">
        {pending ? 'Đang xử lý…' : isSignup ? 'Tạo tài khoản' : 'Đăng nhập'}
      </button>
      <p className="form-switch">
        {isSignup ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}{' '}
        <Link href={`${isSignup ? '/login' : '/signup'}${next !== null ? `?next=${encodeURIComponent(next)}` : ''}`}>
          {isSignup ? 'Đăng nhập' : 'Tạo tài khoản'}
        </Link>
      </p>
    </form>
  );
}
