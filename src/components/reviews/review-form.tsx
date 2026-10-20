'use client';

import { useRouter } from 'next/navigation';
import { useId, useState, type FormEvent } from 'react';
import { submitReviewAction } from '@/actions/reviews';
import type { MyReview } from '@/actions/types';

const RATING_LABELS = ['Rất tệ', 'Chưa tốt', 'Bình thường', 'Tốt', 'Rất tốt'];

/** New review, or a rewrite of a REJECTED one (`initial`); both go to PENDING for an Admin to approve. */
export function ReviewForm({ companyId, companyName, initial }: { companyId: string; companyName: string; initial?: MyReview }) {
  const router = useRouter();
  const id = useId();
  const [rating, setRating] = useState<number>(initial?.rating ?? 0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError('');
    setSuccess('');
    setPending(true);
    try {
      const result = await submitReviewAction({
        companyId,
        rating,
        title: String(data.get('title') ?? ''),
        pros: String(data.get('pros') ?? ''),
        cons: String(data.get('cons') ?? ''),
        anonymous: data.get('anonymous') === 'on',
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSuccess('Đã gửi đánh giá. Đánh giá sẽ hiển thị sau khi quản trị viên duyệt.');
      router.refresh();
    } catch {
      setError('Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setPending(false);
    }
  }

  return (
    <form aria-label={`Viết đánh giá về ${companyName}`} className="form-stack review-form" onSubmit={submit}>
      <fieldset className="review-rating-field">
        <legend className="field-label">Bạn chấm công ty bao nhiêu sao?</legend>
        <div className="review-rating-options">
          {RATING_LABELS.map((label, index) => {
            const value = index + 1;
            return (
              <label className={value <= rating ? 'is-active' : undefined} key={value}>
                <input checked={rating === value} name="rating" onChange={() => setRating(value)} required type="radio" value={value} />
                <span aria-hidden="true">★</span>
                <span className="visually-hidden">{value} sao — {label}</span>
              </label>
            );
          })}
          <span aria-hidden="true" className="review-rating-caption">{rating ? RATING_LABELS[rating - 1] : 'Chọn số sao'}</span>
        </div>
      </fieldset>
      <label className="field-label" htmlFor={`${id}-title`}>
        Tiêu đề
        <input className="text-input" defaultValue={initial?.title} id={`${id}-title`} maxLength={150} minLength={5} name="title" placeholder="Tóm tắt trải nghiệm của bạn" required />
      </label>
      <label className="field-label" htmlFor={`${id}-pros`}>
        Ưu điểm
        <textarea className="text-input textarea-input review-textarea" defaultValue={initial?.pros} id={`${id}-pros`} maxLength={3000} minLength={10} name="pros" placeholder="Điều bạn thấy tốt ở công ty (10–3.000 ký tự)" required />
      </label>
      <label className="field-label" htmlFor={`${id}-cons`}>
        Nhược điểm
        <textarea className="text-input textarea-input review-textarea" defaultValue={initial?.cons} id={`${id}-cons`} maxLength={3000} minLength={10} name="cons" placeholder="Điều công ty nên cải thiện (10–3.000 ký tự)" required />
      </label>
      <label className="review-anonymous-field">
        <input defaultChecked={initial?.anonymous ?? true} name="anonymous" type="checkbox" />
        Đăng ẩn danh (hiển thị “Ứng viên ẩn danh” thay cho tên của bạn)
      </label>
      <div aria-live="polite" role="status">
        {error ? <p className="form-error">{error}</p> : null}
        {success ? <p className="form-success">{success}</p> : null}
      </div>
      <button className="button button-primary" disabled={pending} type="submit">{pending ? 'Đang gửi…' : initial ? 'Gửi lại đánh giá' : 'Gửi đánh giá'}</button>
    </form>
  );
}
