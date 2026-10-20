'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { submitApplicationAction } from '@/actions/applications';
import { MAX_RESUME_BYTES } from '@/actions/applications-schema';
import { CircleCheck, Send } from 'lucide-react';
import { icon, iconLg } from '@/components/ui/primitives';

function resumeError(file: File | null) {
  if (!file || file.size === 0) return 'Vui lòng chọn file CV';
  if (file.type !== 'application/pdf') return 'CV phải là file PDF';
  if (file.size > MAX_RESUME_BYTES) return 'CV tối đa 5 MB';
  return '';
}

export function ApplicationForm({ postingId, hasOnlineCv }: { postingId: string; hasOnlineCv: boolean }) {
  const router = useRouter();
  const [source, setSource] = useState<'ONLINE' | 'FILE'>(hasOnlineCv ? 'ONLINE' : 'FILE');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function selectFile(selected: File | undefined) {
    setFile(selected ?? null);
    setError('');
    setSubmitted(false);
    if (selected) setError(resumeError(selected));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const fileError = source === 'FILE' ? resumeError(file) : '';
    if (fileError) {
      setError(fileError);
      return;
    }

    setPending(true);
    try {
      const formData = new FormData();
      formData.set('postingId', postingId);
      formData.set('cvSource', source);
      if (source === 'FILE' && file) formData.set('resume', file);
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
        <CircleCheck {...iconLg} />
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
        <p>Dùng CV online đã tạo hoặc tải lên CV định dạng PDF, tối đa 5 MB.</p>
      </div>
      <fieldset className="cv-source-options">
        <legend className="visually-hidden">Nguồn CV</legend>
        <label><input checked={source === 'ONLINE'} disabled={!hasOnlineCv} name="cvSource" onChange={() => { setSource('ONLINE'); setError(''); }} type="radio" value="ONLINE" /> Dùng CV online</label>
        <label><input checked={source === 'FILE'} name="cvSource" onChange={() => { setSource('FILE'); setError(''); }} type="radio" value="FILE" /> Tải file PDF</label>
      </fieldset>
      {source === 'ONLINE' ? (
        <p className="application-file-hint">Nhà tuyển dụng nhận bản CV online hiện tại; sửa CV sau khi nộp không đổi đơn này. <Link href="/candidate/cv">Xem CV</Link></p>
      ) : (
      <>
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
      </>
      )}
      {hasOnlineCv ? null : <p className="field-hint">Chưa có CV online? <Link href="/candidate/cv">Tạo CV online</Link></p>}
      {error ? <p className="form-error application-error" id="resume-error" role="alert">{error}</p> : null}
      <button className="button button-primary" disabled={pending} type="submit">
        <Send {...icon} />{pending ? 'Đang nộp hồ sơ…' : 'Nộp hồ sơ'}
      </button>
    </form>
  );
}
