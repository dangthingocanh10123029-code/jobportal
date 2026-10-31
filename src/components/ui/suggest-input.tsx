'use client';

import { useId, useState, type InputHTMLAttributes } from 'react';
import { foldAccents } from './suggestions';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'list'> & { options: readonly string[] };

/** Text input with an accent-insensitive suggestion list ("ha noi" → "Hà Nội"); free text is still allowed. */
export function SuggestInput({ options, defaultValue, className = 'text-input', onChange, ...props }: Props) {
  const listId = useId();
  const [value, setValue] = useState(String(defaultValue ?? ''));
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const query = foldAccents(value.trim());
  const matches = query ? options.filter((o) => foldAccents(o).includes(query) && o !== value).slice(0, 8) : [];
  const shown = open && matches.length > 0;

  function pick(option: string) {
    setValue(option);
    setOpen(false);
    setActive(-1);
  }

  return (
    <span className="suggest">
      <input
        {...props}
        aria-activedescendant={shown && active >= 0 ? `${listId}-${active}` : undefined}
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={shown}
        autoComplete="off"
        className={className}
        onBlur={() => setOpen(false)}
        onChange={(event) => { setValue(event.target.value); setOpen(true); setActive(-1); onChange?.(event); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            if (!matches.length) return;
            event.preventDefault();
            setOpen(true);
            const step = event.key === 'ArrowDown' ? 1 : -1;
            setActive((i) => (i + step + matches.length) % matches.length);
          } else if (event.key === 'Enter' && shown && active >= 0) {
            event.preventDefault();
            pick(matches[active]);
          } else if (event.key === 'Escape' && shown) {
            event.preventDefault();
            setOpen(false);
          }
        }}
        role="combobox"
        value={value}
      />
      <ul className="suggest-list" hidden={!shown} id={listId} role="listbox">
        {shown ? matches.map((option, i) => (
          <li
            aria-selected={i === active}
            id={`${listId}-${i}`}
            key={option}
            onMouseDown={(event) => { event.preventDefault(); pick(option); }}
            role="option"
          >{option}</li>
        )) : null}
      </ul>
    </span>
  );
}
