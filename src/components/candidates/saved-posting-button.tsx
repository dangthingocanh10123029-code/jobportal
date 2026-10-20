'use client';

import { useState } from 'react';
import { toggleSavedPostingAction } from '@/actions/candidates';
import { Heart } from 'lucide-react';
import { icon } from '@/components/ui/primitives';

export function SavedPostingButton({ postingId, initialSaved }: { postingId: string; initialSaved: boolean }) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function toggle() {
    if (pending) return;
    const previous = saved;
    setSaved(!previous);
    setPending(true);
    setError('');
    try {
      const result = await toggleSavedPostingAction({ postingId });
      if (!result.success) { setSaved(previous); setError(result.error); }
      else setSaved(result.data.saved);
    } catch {
      setSaved(previous);
      setError('Không thể cập nhật tin đã lưu. Vui lòng thử lại.');
    } finally {
      setPending(false);
    }
  }

  return <span className="saved-posting-control"><button aria-label={saved ? 'Bỏ lưu' : 'Lưu việc làm'} aria-pressed={saved} className={`saved-posting-button${saved ? ' is-saved' : ''}`} disabled={pending} onClick={toggle} title={saved ? 'Bỏ lưu' : 'Lưu việc làm'} type="button"><Heart {...icon} fill={saved ? 'currentColor' : 'none'} size={18} /></button>{error ? <span className="saved-posting-error" role="alert">{error}</span> : null}</span>;
}
