'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { resendSignupOtpAction, verifySignupOtpAction } from '@/actions/auth';

export function OtpStep({ email }: { email: string }) {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(60);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timeout = window.setTimeout(() => setResendCooldown((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timeout);
  }, [resendCooldown]);

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      const result = await verifySignupOtpAction({ email, token });
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.push('/account');
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function handleResend() {
    setPending(true);
    setError('');
    try {
      const result = await resendSignupOtpAction({ email });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setResendCooldown(60);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="form-stack">
      <p className="form-success" role="status">Đã gửi mã tới {email}</p>
      <form className="form-stack" onSubmit={handleVerify}>
        <label className="field-label">
          Mã xác nhận
          <input
            autoComplete="one-time-code"
            className="text-input"
            inputMode="numeric"
            maxLength={10}
            minLength={6}
            name="token"
            onChange={(event) => setToken(event.target.value.replace(/\D/g, '').slice(0, 10))}
            pattern="[0-9]{6,10}"
            placeholder="Nhập mã trong email"
            required
            value={token}
          />
        </label>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <button className="button button-primary button-wide" disabled={pending} type="submit">
          {pending ? 'Đang xác nhận…' : 'Xác nhận'}
        </button>
      </form>
      <button className="button button-quiet button-wide" disabled={pending || resendCooldown > 0} onClick={handleResend} type="button">
        {pending ? 'Đang gửi mã…' : resendCooldown > 0 ? `Gửi lại mã sau ${resendCooldown} giây` : 'Gửi lại mã'}
      </button>
    </div>
  );
}
