import { useEffect, useRef, useState } from 'react';

interface Option { value: string; label: string; count?: number; color?: string; }

interface Props {
  label: string;
  options: Option[];
  selected: string[];
  onChange: (vals: string[]) => void;
}

export function MultiSelect({ label, options, selected, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onEsc); };
  }, [open]);

  const toggle = (v: string) => {
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  };

  return (
    <div className="ms" ref={ref}>
      <button
        type="button"
        className={'ms-trigger' + (selected.length ? ' active' : '')}
        onClick={() => setOpen((o) => !o)}
      >
        {label}
        {selected.length > 0 && <span className="cnt">{selected.length}</span>}
        <span className="caret">▼</span>
      </button>
      {open && (
        <div className="ms-panel">
          <div className="ms-head">
            <button type="button" onClick={() => onChange(options.map((o) => o.value))}>Tümü</button>
            <button type="button" onClick={() => onChange([])}>Temizle</button>
          </div>
          <div className="ms-options">
            {options.map((o) => (
              <label className="ms-opt" key={o.value}>
                <input type="checkbox" checked={selected.includes(o.value)} onChange={() => toggle(o.value)} />
                {o.color && <span className="sw" style={{ background: o.color }} />}
                <span className="lbl">{o.label}</span>
                {o.count != null && <span className="ct">{o.count}</span>}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
