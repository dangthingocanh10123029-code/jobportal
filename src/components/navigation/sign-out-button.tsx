'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOutAction } from '@/actions/auth';
import { LogOut } from 'lucide-react';
import { icon } from '@/components/ui/primitives';

export function SignOutButton() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    setError('');
    const result = await signOutAction();
    setPending(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    router.push('/login');
    router.refresh();
  }

  return (
    <div className="nav-account-actions">
      {error ? <span className="nav-error" role="alert">{error}</span> : null}
      <button className="button button-quiet button-small" disabled={pending} onClick={signOut} type="button">
        <LogOut {...icon} />{pending ? 'Đang đăng xuất…' : 'Đăng xuất'}
      </button>
    </div>
  );
}
