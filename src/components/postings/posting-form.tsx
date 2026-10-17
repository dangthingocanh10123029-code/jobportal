'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { createPostingDraftAction, updatePostingAction } from '@/actions/postings';
import type { EmploymentType, JobPosting, PostingInput } from '@/actions/types';

const employmentTypes: { value: EmploymentType; label: string }[] = [
  { value: 'FULL_TIME', label: 'Toàn thời gian' },
  { value: 'PART_TIME', label: 'Bán thời gian' },
  { value: 'INTERNSHIP', label: 'Thực tập' },
  { value: 'CONTRACT', label: 'Hợp đồng' },
];

function toLocalDateTime(isoDate: string) {
  const date = new Date(isoDate);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function readInput(form: HTMLFormElement): PostingInput {
  const values = new FormData(form);
  const salaryMin = String(values.get('salaryMin') ?? '').trim();
  const salaryMax = String(values.get('salaryMax') ?? '').trim();
  const localDeadline = String(values.get('applicationDeadline') ?? '');

  return {
    title: String(values.get('title') ?? '').trim(),
    description: String(values.get('description') ?? '').trim(),
    location: String(values.get('location') ?? '').trim(),
    employmentType: String(values.get('employmentType') ?? 'FULL_TIME') as EmploymentType,
    salaryMin: salaryMin ? Number(salaryMin) : null,
    salaryMax: salaryMax ? Number(salaryMax) : null,
    applicationDeadline: new Date(localDeadline).toISOString(),
    // Tạm cho 14B: giá trị tin cũ trước v2, Codex thay bằng field thật.
    industry: 'OTHER',
    level: 'JUNIOR',
    experienceYears: 0,
    headcount: 1,
    skills: [],
    requirements: '',
    benefits: '',
  };
}

export function PostingForm({ mode, initialPosting }: { mode: 'create' | 'edit'; initialPosting?: JobPosting }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [salaryError, setSalaryError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = readInput(form);
    setError('');
    setSalaryError('');
    if (input.salaryMin !== null && input.salaryMax !== null && input.salaryMin > input.salaryMax) {
      setSalaryError('Mức lương tối thiểu không thể cao hơn mức lương tối đa.');
      return;
    }

    setPending(true);
    try {
      const result = mode === 'create'
        ? await createPostingDraftAction(input)
        : await updatePostingAction({ ...input, id: initialPosting!.id });
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.push('/employer/postings');
      router.refresh();
    } catch {
      setError('Không thể lưu tin lúc này. Vui lòng thử lại.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="form-stack posting-form" onSubmit={handleSubmit}>
      <label className="field-label">
        Tiêu đề công việc <span className="required-mark">*</span>
        <input autoComplete="off" className="text-input" defaultValue={initialPosting?.title ?? ''} maxLength={150} minLength={5} name="title" placeholder="Ví dụ: Chuyên viên Marketing" required />
      </label>
      <label className="field-label">
        Mô tả công việc <span className="required-mark">*</span>
        <textarea className="text-input textarea-input" defaultValue={initialPosting?.description ?? ''} minLength={20} name="description" placeholder="Mô tả trách nhiệm, yêu cầu và quyền lợi của vị trí…" required rows={7} />
      </label>
      <div className="form-field-grid">
        <label className="field-label">
          Địa điểm làm việc <span className="required-mark">*</span>
          <input className="text-input" defaultValue={initialPosting?.location ?? ''} name="location" placeholder="Hà Nội, TP. Hồ Chí Minh, Remote…" required />
        </label>
        <label className="field-label">
          Hình thức làm việc <span className="required-mark">*</span>
          <select className="text-input select-input" defaultValue={initialPosting?.employmentType ?? 'FULL_TIME'} name="employmentType">
            {employmentTypes.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </div>
      <fieldset className="salary-fieldset">
        <legend>Mức lương <span className="field-optional">(không bắt buộc)</span></legend>
        <div className="form-field-grid salary-grid">
          <label className="field-label">
            Tối thiểu
            <span className="input-with-suffix"><input className="text-input" defaultValue={initialPosting?.salaryMin ?? ''} min="0" name="salaryMin" placeholder="Để trống nếu thỏa thuận" type="number" /><span>₫ / tháng</span></span>
          </label>
          <label className="field-label">
            Tối đa
            <span className="input-with-suffix"><input className="text-input" defaultValue={initialPosting?.salaryMax ?? ''} min="0" name="salaryMax" placeholder="Để trống nếu thỏa thuận" type="number" /><span>₫ / tháng</span></span>
          </label>
        </div>
        {salaryError ? <p className="form-error" role="alert">{salaryError}</p> : null}
        <p className="field-hint">Để trống cả hai mức nếu mức lương có thể thỏa thuận.</p>
      </fieldset>
      <label className="field-label">
        Hạn nhận hồ sơ <span className="required-mark">*</span>
        <input className="text-input date-input" defaultValue={initialPosting ? toLocalDateTime(initialPosting.applicationDeadline) : ''} name="applicationDeadline" required type="datetime-local" />
      </label>
      <p className="posting-form-note"><span aria-hidden="true">ⓘ</span> Tin mới sẽ được lưu ở trạng thái bản nháp. Bạn có thể đăng tin ngay từ danh sách tin tuyển dụng.</p>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <div className="posting-form-actions">
        <button className="button button-primary" disabled={pending} type="submit">{pending ? 'Đang lưu…' : mode === 'create' ? 'Lưu bản nháp' : 'Lưu thay đổi'}</button>
        <button className="button button-quiet" onClick={() => router.push('/employer/postings')} type="button">Hủy</button>
      </div>
    </form>
  );
}
