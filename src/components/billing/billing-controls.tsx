'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition, type FormEvent } from 'react';
import { cancelOrderAction, createOrderAction, payOrderAction, savePackageAction } from '@/actions/billing';
import type { ServicePackage } from '@/actions/types';
import { formatVnd } from './labels';

function useBillingAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  return { router, pending, startTransition, error, setError, success, setSuccess };
}

function Messages({ error, success }: { error: string; success: string }) {
  return <div aria-live="polite">
    {error ? <p className="billing-message is-error" role="alert">{error}</p> : null}
    {success ? <p className="billing-message" role="status">{success}</p> : null}
  </div>;
}

/** Pick an open posting + a package → PENDING order → checkout page. */
export function OrderForm({ packages, postings, initialPostingId }: {
  packages: ServicePackage[]; postings: { id: string; title: string }[]; initialPostingId?: string;
}) {
  const state = useBillingAction();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    state.setError('');
    state.startTransition(async () => {
      try {
        const result = await createOrderAction({ postingId: String(form.get('postingId') ?? ''), packageId: String(form.get('packageId') ?? '') });
        if (!result.success) { state.setError(result.error); return; }
        state.router.push(`/employer/billing/checkout/${result.data.id}`);
      } catch { state.setError('Không thể tạo đơn hàng. Vui lòng thử lại.'); }
    });
  }
  if (!postings.length) return <p className="billing-hint">Bạn chưa có tin nào đang tuyển. Đăng tin trước, rồi quay lại để đẩy tin nổi bật.</p>;
  return <form className="billing-order-form" onSubmit={submit}>
    <label className="field-label" htmlFor="billing-posting">Tin muốn đẩy
      <select className="text-input select-input" defaultValue={postings.some((p) => p.id === initialPostingId) ? initialPostingId : postings[0].id} id="billing-posting" name="postingId" required>
        {postings.map((posting) => <option key={posting.id} value={posting.id}>{posting.title}</option>)}
      </select>
    </label>
    <fieldset className="billing-package-options">
      <legend>Gói dịch vụ</legend>
      {packages.map((pkg, index) => <label className="billing-package-option" key={pkg.id}>
        <input defaultChecked={index === 0} name="packageId" required type="radio" value={pkg.id} />
        <span><strong>{pkg.name}</strong><small>{pkg.durationDays} ngày · {formatVnd(pkg.priceVnd)}</small></span>
      </label>)}
    </fieldset>
    <button className="button button-primary" disabled={state.pending} type="submit">{state.pending ? 'Đang tạo đơn…' : 'Tạo đơn hàng'}</button>
    <Messages error={state.error} success={state.success} />
  </form>;
}

/** SIMULATED payment: nothing is charged. */
export function CheckoutActions({ orderId }: { orderId: string }) {
  const state = useBillingAction();
  function run(kind: 'pay' | 'cancel') {
    if (kind === 'cancel' && !window.confirm('Hủy đơn hàng này?')) return;
    state.setError(''); state.setSuccess('');
    state.startTransition(async () => {
      try {
        const result = await (kind === 'pay' ? payOrderAction : cancelOrderAction)({ orderId });
        if (!result.success) { state.setError(result.error); return; }
        state.setSuccess(kind === 'pay' ? 'Thanh toán giả lập thành công. Tin của bạn đã được đẩy nổi bật.' : 'Đã hủy đơn hàng.');
        state.router.refresh();
      } catch { state.setError('Không thể xử lý đơn hàng. Vui lòng thử lại.'); }
    });
  }
  return <div className="billing-checkout-actions">
    <div className="billing-checkout-buttons">
      <button className="button button-primary" disabled={state.pending} onClick={() => run('pay')} type="button">{state.pending ? 'Đang xử lý…' : 'Thanh toán (giả lập)'}</button>
      <button className="button button-quiet" disabled={state.pending} onClick={() => run('cancel')} type="button">Hủy đơn</button>
    </div>
    <Messages error={state.error} success={state.success} />
  </div>;
}

/** Create (no `pkg`) or edit a package; the API writes the audit entry. */
export function PackageEditor({ pkg }: { pkg?: ServicePackage }) {
  const state = useBillingAction();
  const prefix = pkg ? `package-${pkg.id}` : 'package-new';
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    state.setError(''); state.setSuccess('');
    state.startTransition(async () => {
      try {
        const result = await savePackageAction({
          ...(pkg ? { id: pkg.id } : {}),
          code: String(form.get('code') ?? ''),
          name: String(form.get('name') ?? ''),
          description: String(form.get('description') ?? ''),
          priceVnd: Number(form.get('priceVnd')),
          durationDays: Number(form.get('durationDays')),
          active: form.get('active') === 'on',
        });
        if (!result.success) { state.setError(result.error); return; }
        state.setSuccess(pkg ? 'Đã lưu gói dịch vụ.' : 'Đã tạo gói dịch vụ.');
        if (!pkg) element.reset();
        state.router.refresh();
      } catch { state.setError('Không thể lưu gói dịch vụ. Vui lòng thử lại.'); }
    });
  }
  return <form className="billing-package-editor" onSubmit={submit}>
    <label htmlFor={`${prefix}-code`}><span>Mã gói</span><input className="text-input" defaultValue={pkg?.code} id={`${prefix}-code`} maxLength={30} name="code" pattern="[A-Z0-9_]{2,30}" placeholder="TOP_7" required title="A–Z, 0–9, _ (2–30 ký tự)" /></label>
    <label htmlFor={`${prefix}-name`}><span>Tên gói</span><input className="text-input" defaultValue={pkg?.name} id={`${prefix}-name`} maxLength={100} minLength={2} name="name" required /></label>
    <label htmlFor={`${prefix}-price`}><span>Giá (₫)</span><input className="text-input" defaultValue={pkg?.priceVnd} id={`${prefix}-price`} max={100000000} min={0} name="priceVnd" required step={1000} type="number" /></label>
    <label htmlFor={`${prefix}-days`}><span>Thời hạn (ngày)</span><input className="text-input" defaultValue={pkg?.durationDays} id={`${prefix}-days`} max={90} min={1} name="durationDays" required type="number" /></label>
    <label className="billing-package-description" htmlFor={`${prefix}-description`}><span>Mô tả</span><textarea className="text-input" defaultValue={pkg?.description} id={`${prefix}-description`} maxLength={500} name="description" rows={2} /></label>
    <label className="billing-package-active" htmlFor={`${prefix}-active`}><input defaultChecked={pkg?.active ?? true} id={`${prefix}-active`} name="active" type="checkbox" /><span>Đang bán</span></label>
    <button className="button button-primary button-small" disabled={state.pending} type="submit">{state.pending ? 'Đang lưu…' : pkg ? 'Lưu thay đổi' : 'Tạo gói'}</button>
    <Messages error={state.error} success={state.success} />
  </form>;
}
