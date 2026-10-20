'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { deleteMyCvAction, saveMyCvAction } from '@/actions/cv';
import type { CvItem, CvTemplate } from '@/actions/types';
import { SkillsTagInput } from '@/components/postings/skills-tag-input';
import { CvDocument, type CvContent } from './cv-document';

type Cert = CvContent['certifications'][number];

const MAX_ITEMS = 15;
const emptyItem: CvItem = { title: '', organization: '', startDate: '', endDate: null, description: '' };
const emptyCert: Cert = { name: '', issuer: null, year: null };
const templates: { value: CvTemplate; label: string; hint: string }[] = [
  { value: 'CLASSIC', label: 'Cổ điển', hint: 'Một cột, trang trọng' },
  { value: 'MODERN', label: 'Hiện đại', hint: 'Dải màu nhấn, tiêu đề nổi bật' },
];

function move<T>(list: T[], index: number, delta: number): T[] {
  const next = [...list];
  [next[index], next[index + delta]] = [next[index + delta], next[index]];
  return next;
}

function RowControls({ label, index, count, onChange }: { label: string; index: number; count: number; onChange: (action: 'up' | 'down' | 'remove') => void }) {
  return (
    <div aria-label={`Thao tác ${label} ${index + 1}`} className="cv-row-controls" role="group">
      <button aria-label={`Đưa ${label} ${index + 1} lên`} className="button button-quiet button-small" disabled={index === 0} onClick={() => onChange('up')} type="button">↑</button>
      <button aria-label={`Đưa ${label} ${index + 1} xuống`} className="button button-quiet button-small" disabled={index === count - 1} onClick={() => onChange('down')} type="button">↓</button>
      <button aria-label={`Xóa ${label} ${index + 1}`} className="button button-danger button-small" onClick={() => onChange('remove')} type="button">Xóa</button>
    </div>
  );
}

function applyRow<T>(list: T[], index: number, action: 'up' | 'down' | 'remove'): T[] {
  if (action === 'remove') return list.filter((_, i) => i !== index);
  return move(list, index, action === 'up' ? -1 : 1);
}

function ItemsEditor({ legend, label, titleLabel, orgLabel, items, onChange }: { legend: string; label: string; titleLabel: string; orgLabel: string; items: CvItem[]; onChange: (items: CvItem[]) => void }) {
  const update = (index: number, patch: Partial<CvItem>) => onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  return (
    <fieldset className="cv-fieldset">
      <legend>{legend} <span className="field-optional">({items.length}/{MAX_ITEMS})</span></legend>
      {items.length === 0 ? <p className="field-hint">Chưa có mục nào.</p> : null}
      {items.map((item, index) => (
        <div className="cv-row" key={index}>
          <div className="cv-row-grid">
            <label className="field-label">{titleLabel}<input className="text-input" maxLength={150} onChange={(e) => update(index, { title: e.target.value })} required value={item.title} /></label>
            <label className="field-label">{orgLabel}<input className="text-input" maxLength={150} onChange={(e) => update(index, { organization: e.target.value })} required value={item.organization} /></label>
            <label className="field-label">Từ tháng<input className="text-input" onChange={(e) => update(index, { startDate: e.target.value })} required type="month" value={item.startDate} /></label>
            <label className="field-label">Đến tháng<input className="text-input" disabled={item.endDate === null} onChange={(e) => update(index, { endDate: e.target.value })} type="month" value={item.endDate ?? ''} /></label>
          </div>
          <label className="cv-checkbox"><input checked={item.endDate === null} onChange={(e) => update(index, { endDate: e.target.checked ? null : '' })} type="checkbox" /> Hiện tại</label>
          <label className="field-label">Mô tả <span className="field-optional">(tối đa 2000 ký tự)</span><textarea className="text-input textarea-input" maxLength={2000} onChange={(e) => update(index, { description: e.target.value })} rows={3} value={item.description} /></label>
          <RowControls count={items.length} index={index} label={label} onChange={(action) => onChange(applyRow(items, index, action))} />
        </div>
      ))}
      <button className="button button-quiet button-small" disabled={items.length >= MAX_ITEMS} onClick={() => onChange([...items, { ...emptyItem }])} type="button">+ Thêm {label}</button>
    </fieldset>
  );
}

export function CvEditor({ initial, hasCv }: { initial: CvContent; hasCv: boolean }) {
  const router = useRouter();
  const [cv, setCv] = useState(initial);
  const [saved, setSaved] = useState(hasCv);
  const [pending, setPending] = useState<'save' | 'delete' | null>(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const set = (patch: Partial<CvContent>) => { setCv((current) => ({ ...current, ...patch })); setStatus(''); };
  const updateCert = (index: number, patch: Partial<Cert>) => set({ certifications: cv.certifications.map((cert, i) => (i === index ? { ...cert, ...patch } : cert)) });

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending('save');
    setError('');
    setStatus('');
    try {
      const result = await saveMyCvAction(cv);
      if (!result.success) { setError(result.error); return; }
      setSaved(true);
      setStatus('Đã lưu CV online.');
      router.refresh();
    } catch {
      setError('Không thể lưu CV lúc này. Vui lòng thử lại.');
    } finally {
      setPending(null);
    }
  }

  async function remove() {
    if (!window.confirm('Xóa CV online? Các đơn đã nộp vẫn giữ bản CV lúc nộp.')) return;
    setPending('delete');
    setError('');
    setStatus('');
    try {
      const result = await deleteMyCvAction();
      if (!result.success) { setError(result.error); return; }
      setSaved(false);
      setStatus('Đã xóa CV online.');
      router.refresh();
    } catch {
      setError('Không thể xóa CV lúc này. Vui lòng thử lại.');
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="cv-editor-layout">
      <form className="surface-card form-stack cv-editor" onSubmit={save}>
        <fieldset className="cv-fieldset">
          <legend>Mẫu CV</legend>
          <div className="cv-template-options">
            {templates.map((template) => (
              <label className={`cv-template-option${cv.template === template.value ? ' is-selected' : ''}`} key={template.value}>
                <input checked={cv.template === template.value} name="template" onChange={() => set({ template: template.value })} type="radio" value={template.value} />
                <span><strong>{template.label}</strong><small>{template.hint}</small></span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="cv-fieldset">
          <legend>Thông tin cá nhân</legend>
          <div className="cv-row-grid">
            <label className="field-label">Họ và tên <span className="required-mark" aria-hidden="true">*</span><input autoComplete="name" className="text-input" maxLength={100} onChange={(e) => set({ fullName: e.target.value })} required value={cv.fullName} /></label>
            <label className="field-label">Chức danh<input className="text-input" maxLength={150} onChange={(e) => set({ headline: e.target.value })} placeholder="Ví dụ: Lập trình viên Frontend" value={cv.headline ?? ''} /></label>
            <label className="field-label">Email <span className="required-mark" aria-hidden="true">*</span><input autoComplete="email" className="text-input" maxLength={254} onChange={(e) => set({ email: e.target.value })} required type="email" value={cv.email} /></label>
            <label className="field-label">Số điện thoại<input autoComplete="tel" className="text-input" maxLength={20} onChange={(e) => set({ phone: e.target.value })} type="tel" value={cv.phone ?? ''} /></label>
            <label className="field-label">Địa chỉ<input className="text-input" maxLength={150} onChange={(e) => set({ location: e.target.value })} value={cv.location ?? ''} /></label>
          </div>
          <label className="field-label">Giới thiệu bản thân <span className="field-optional">(tối đa 2000 ký tự)</span><textarea className="text-input textarea-input" maxLength={2000} onChange={(e) => set({ summary: e.target.value })} rows={4} value={cv.summary ?? ''} /></label>
        </fieldset>

        <ItemsEditor items={cv.experiences} label="kinh nghiệm" legend="Kinh nghiệm làm việc" onChange={(experiences) => set({ experiences })} orgLabel="Công ty" titleLabel="Vị trí" />
        <ItemsEditor items={cv.educations} label="học vấn" legend="Học vấn" onChange={(educations) => set({ educations })} orgLabel="Trường" titleLabel="Ngành học / Bằng cấp" />

        <fieldset className="cv-fieldset">
          <legend>Kỹ năng</legend>
          <SkillsTagInput maxSkills={30} onChange={(skills) => set({ skills })} skills={cv.skills} />
        </fieldset>
        <fieldset className="cv-fieldset">
          <legend>Ngoại ngữ</legend>
          <SkillsTagInput maxSkills={10} noun="ngoại ngữ" onChange={(languages) => set({ languages })} skills={cv.languages} />
        </fieldset>

        <fieldset className="cv-fieldset">
          <legend>Chứng chỉ <span className="field-optional">({cv.certifications.length}/{MAX_ITEMS})</span></legend>
          {cv.certifications.length === 0 ? <p className="field-hint">Chưa có chứng chỉ nào.</p> : null}
          {cv.certifications.map((cert, index) => (
            <div className="cv-row" key={index}>
              <div className="cv-row-grid">
                <label className="field-label">Tên chứng chỉ<input className="text-input" maxLength={150} onChange={(e) => updateCert(index, { name: e.target.value })} required value={cert.name} /></label>
                <label className="field-label">Nơi cấp<input className="text-input" maxLength={150} onChange={(e) => updateCert(index, { issuer: e.target.value })} value={cert.issuer ?? ''} /></label>
                <label className="field-label">Năm cấp<input className="text-input" inputMode="numeric" max={2100} min={1950} onChange={(e) => updateCert(index, { year: e.target.value ? Number(e.target.value) : null })} type="number" value={cert.year ?? ''} /></label>
              </div>
              <RowControls count={cv.certifications.length} index={index} label="chứng chỉ" onChange={(action) => set({ certifications: applyRow(cv.certifications, index, action) })} />
            </div>
          ))}
          <button className="button button-quiet button-small" disabled={cv.certifications.length >= MAX_ITEMS} onClick={() => set({ certifications: [...cv.certifications, { ...emptyCert }] })} type="button">+ Thêm chứng chỉ</button>
        </fieldset>

        <div aria-live="polite">
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          {status ? <p className="form-success" role="status">{status}</p> : null}
        </div>
        <div className="posting-form-actions">
          <button className="button button-primary" disabled={pending !== null} type="submit">{pending === 'save' ? 'Đang lưu…' : 'Lưu CV'}</button>
          {saved ? <Link className="button button-quiet" href="/candidate/cv/print">In / Lưu PDF</Link> : null}
          {saved ? <button className="button button-danger" disabled={pending !== null} onClick={remove} type="button">{pending === 'delete' ? 'Đang xóa…' : 'Xóa CV'}</button> : null}
        </div>
      </form>

      <section aria-label="Xem trước CV" className="cv-preview">
        <span className="eyebrow">Xem trước</span>
        <CvDocument cv={cv} />
      </section>
    </div>
  );
}
