'use client';

import { useEffect, useState, useTransition, type ChangeEvent, type FormEvent } from 'react';
import { updateMyCompanyAction, uploadCompanyLogoAction } from '@/actions/companies';
import type { Company, CompanySize } from '@/actions/types';
import { companySizeLabels } from '@/components/format';

const MAX_LOGO_SIZE = 1024 * 1024;
const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const COMPANY_SIZES: CompanySize[] = ['S1_10', 'S11_50', 'S51_200', 'S201_500', 'S500_PLUS'];

export function CompanyProfileForm({ initialCompany }: { initialCompany: Company }) {
  const [company, setCompany] = useState(initialCompany);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!logoFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(logoFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [logoFile]);

  function onLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0] ?? null;
    setMessage('');
    if (file && !LOGO_TYPES.includes(file.type)) {
      event.currentTarget.value = '';
      setLogoFile(null);
      setMessage('Logo phải là ảnh PNG, JPEG hoặc WebP.');
      return;
    }
    if (file && file.size > MAX_LOGO_SIZE) {
      event.currentTarget.value = '';
      setLogoFile(null);
      setMessage('Logo không được vượt quá 1 MB.');
      return;
    }
    setLogoFile(file);
  }

  function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setMessage('');
    startTransition(async () => {
      const result = await updateMyCompanyAction({
        name: String(formData.get('name') ?? ''),
        about: String(formData.get('about') ?? ''),
        size: COMPANY_SIZES.find((size) => size === formData.get('size')) ?? null,
        address: String(formData.get('address') ?? ''),
        website: String(formData.get('website') ?? ''),
      });
      if (result.success) {
        setCompany(result.data);
        setMessage('Đã lưu hồ sơ công ty.');
      } else setMessage(result.error);
    });
  }

  function onUploadLogo() {
    if (!logoFile) return;
    const data = new FormData();
    data.set('logo', logoFile);
    setMessage('');
    startTransition(async () => {
      const result = await uploadCompanyLogoAction(data);
      if (result.success) {
        setCompany(result.data);
        setLogoFile(null);
        setMessage('Đã cập nhật logo công ty.');
      } else setMessage(result.error);
    });
  }

  return (
    <div className="company-profile-layout">
      <section aria-labelledby="company-logo-title" className="surface-card company-logo-card">
        <h2 id="company-logo-title">Logo công ty</h2>
        <img alt={previewUrl ? 'Xem trước logo công ty' : `Logo ${company.name}`} className="company-profile-logo" height="112" src={previewUrl ?? company.logoUrl ?? '/images/company-placeholder.svg'} width="112" />
        <label className="field-label" htmlFor="company-logo">Chọn ảnh PNG, JPEG hoặc WebP (tối đa 1 MB)</label>
        <input accept="image/png,image/jpeg,image/webp" className="text-input" id="company-logo" onChange={onLogoChange} type="file" />
        <button className="button button-quiet" disabled={!logoFile || isPending} onClick={onUploadLogo} type="button">
          {isPending ? 'Đang tải…' : 'Tải logo lên'}
        </button>
      </section>

      <form className="surface-card company-profile-form" onSubmit={onSave}>
        <div className="page-heading"><span className="eyebrow">Thông tin nhà tuyển dụng</span><h2>Hồ sơ công ty</h2><p>Giúp ứng viên hiểu hơn về nơi làm việc của bạn.</p></div>
        <label className="field-label" htmlFor="company-name">Tên công ty<input autoComplete="organization" className="text-input" defaultValue={company.name} id="company-name" maxLength={150} name="name" required /></label>
        <label className="field-label" htmlFor="company-about">Giới thiệu<textarea className="text-input company-about-input" defaultValue={company.about ?? ''} id="company-about" maxLength={5000} name="about" placeholder="Chia sẻ về lĩnh vực, văn hóa và đội ngũ của công ty." rows={7} /></label>
        <label className="field-label" htmlFor="company-size">Quy mô công ty<select className="text-input select-input" defaultValue={company.size ?? ''} id="company-size" name="size"><option value="">Chưa cập nhật</option>{Object.entries(companySizeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="field-label" htmlFor="company-address">Địa chỉ<input autoComplete="street-address" className="text-input" defaultValue={company.address ?? ''} id="company-address" maxLength={300} name="address" placeholder="Ví dụ: Quận 1, TP. Hồ Chí Minh" /></label>
        <label className="field-label" htmlFor="company-website">Website<input autoComplete="url" className="text-input" defaultValue={company.website ?? ''} id="company-website" maxLength={300} name="website" placeholder="https://example.com" type="url" /></label>
        <div className="company-profile-actions"><button className="button button-primary" disabled={isPending} type="submit">{isPending ? 'Đang lưu…' : 'Lưu hồ sơ'}</button>{message ? <p aria-live="polite" className="form-feedback">{message}</p> : null}</div>
      </form>
    </div>
  );
}
