'use client';

import { useState, type KeyboardEvent } from 'react';

export function SkillsTagInput({ skills, onChange, maxSkills = 20, noun = 'kỹ năng' }: { skills: string[]; onChange: (skills: string[]) => void; maxSkills?: number; noun?: string }) {
  const Noun = noun[0].toLocaleUpperCase() + noun.slice(1);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');

  function addSkill(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const skill = draft.trim();
    if (!skill) return;
    if (skill.length > 30) { setError(`Mỗi ${noun} tối đa 30 ký tự.`); return; }
    if (skills.some((item) => item.toLocaleLowerCase() === skill.toLocaleLowerCase())) { setError(`${Noun} này đã được thêm.`); return; }
    if (skills.length >= maxSkills) { setError(`Bạn chỉ có thể thêm tối đa ${maxSkills} ${noun}.`); return; }
    onChange([...skills, skill]);
    setDraft('');
    setError('');
  }

  return (
    <div className="skills-tag-input">
      <div aria-label={`${Noun} đã thêm`} className="skill-tag-list">
        {skills.map((skill) => <span className="skill-tag" key={skill.toLocaleLowerCase()}>{skill}<button aria-label={`Xóa ${noun} ${skill}`} onClick={() => onChange(skills.filter((item) => item !== skill))} type="button">×</button><input name="skills" type="hidden" value={skill} /></span>)}
      </div>
      <input aria-label={`Thêm ${noun}`} className="text-input" disabled={skills.length >= maxSkills} maxLength={30} onChange={(event) => { setDraft(event.target.value); setError(''); }} onKeyDown={addSkill} placeholder={skills.length >= maxSkills ? `Đã đạt tối đa ${maxSkills} ${noun}` : `Nhập ${noun} rồi nhấn Enter`} value={draft} />
      {error ? <span className="form-error" role="alert">{error}</span> : null}
      <span className="field-hint">Tối đa {maxSkills} {noun}, mỗi {noun} không quá 30 ký tự.</span>
    </div>
  );
}
