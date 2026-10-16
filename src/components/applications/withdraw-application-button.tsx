'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { withdrawApplicationAction } from '@/actions/applications';

export function WithdrawApplicationButton({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function withdraw() {
    setError('');
    setPending(true);
    try {
      const result = await withdrawApplicationAction({ applicationId });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setConfirming(false);
      router.refresh();
    } catch {
      setError('Không thể rút hồ sơ lúc này. Vui lòng thử lại.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="withdraw-application-control">
      {confirming ? (
        <div aria-label="Xác nhận rút hồ sơ" className="withdraw-confirmation" role="group">
          <span>Bạn có chắc muốn rút hồ sơ?</span>
          <button className="button button-danger button-small" disabled={pending} onClick={withdraw} type="button">
            {pending ? 'Đang xử lý…' : 'Xác nhận rút'}
          </button>
          <button className="button button-quiet button-small" disabled={pending} onClick={() => setConfirming(false)} type="button">
            Giữ hồ sơ
          </button>
        </div>
      ) : (
        <button className="button button-danger button-small" onClick={() => setConfirming(true)} type="button">
          Rút hồ sơ
        </button>
      )}
      {error ? <p className="form-error withdraw-application-error" role="alert">{error}</p> : null}
    </div>
  );
}
