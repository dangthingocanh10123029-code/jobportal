'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { submitApplicationAction } from '@/actions/applications';
import { MAX_RESUME_BYTES } from '@/actions/applications-schema';

export function ApplicationForm({ postingId }: { postingId: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function selectFile(selected: File | undefined) {
    setFile(selected ?? null);
    setError('');
    setSubmitted(false);
    if (!selected) return;
    if (selected.type !== 'application/pdf') {
      setError('CV phải là file PDF');
    } else if (selected.size > MAX_RESUME_BYTES) {
      setError('CV tối đa 5 MB');
    } else if (selected.size === 0) {
      setError('Vui lòng chọn file CV');
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!file) {
      setError('Vui lòng chọn file CV');
      return;
    }
    if (file.type !== 'application/pdf') {
      setError('CV phải là file PDF');
      return;
    }
    if (file.size > MAX_RESUME_BYTES) {
      setError('CV tối đa 5 MB');
      return;
    }
    if (file.size === 0) {
      setError('Vui lòng chọn file CV');
      return;
    }

    setPending(true);
    try {
      const formData = new FormData();
      formData.set('postingId', postingId);
      formData.set('resume', file);
      const result = await submitApplicationAction(formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSubmitted(true);
      router.refresh();
    } catch {
      setError('Không thể nộp hồ sơ lúc này. Vui lòng thử lại.');
    } finally {
      setPending(false);
    }
  }

  if (submitted) {
    return (
      <div aria-live="polite" className="application-submitted">
        <span aria-hidden="true">✓</span>
        <div>
          <strong>Đã nộp hồ sơ</strong>
          <p>Hồ sơ ứng tuyển của bạn đã được gửi đến nhà tuyển dụng.</p>
        </div>
      </div>
    );
  }

  return (
    <form className="application-form" onSubmit={handleSubmit}>
      <div className="application-form-copy">
        <h2>Nộp hồ sơ ứng tuyển</h2>
        <p>Chọn CV định dạng PDF, dung lượng tối đa 5 MB.</p>
      </div>
      <label className="field-label application-file-label" htmlFor="resume-file">
        CV của bạn <span className="required-mark" aria-hidden="true">*</span>
        <input
          accept="application/pdf,.pdf"
          aria-describedby={error ? 'resume-error' : 'resume-hint'}
          className="application-file-input"
          id="resume-file"
          name="resume"
          onChange={(event) => selectFile(event.currentTarget.files?.[0])}
          type="file"
        />
      </label>
      <p className="application-file-hint" id="resume-hint">
        {file ? `${file.name} · ${(file.size / (1024 * 1024)).toFixed(2)} MB` : 'Chưa chọn tệp nào'}
      </p>
      {error ? <p className="form-error application-error" id="resume-error" role="alert">{error}</p> : null}
      <button className="button button-primary" disabled={pending} type="submit">
        {pending ? 'Đang nộp hồ sơ…' : 'Nộp hồ sơ'}
      </button>
    </form>
  );
}
