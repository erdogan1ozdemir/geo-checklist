import { useRef, useState } from 'react';
import { Popover } from './Popover';
import { DURUM_OPTIONS } from '../lib/xlsxExport.js';

/* ---------------- helpers ---------------- */
const STATUS_CLS: Record<string, string> = {
  'Yapılmadı': 'todo',
  'Devam Ediyor': 'prog',
  'Tamamlandı': 'done',
  'Beklemede': 'hold',
  'İptal': 'cancel',
};

function trLower(s: string) { return s.toLocaleLowerCase('tr-TR'); }

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toLocaleUpperCase('tr-TR');
  return (parts[0][0] + parts[parts.length - 1][0]).toLocaleUpperCase('tr-TR');
}

const AV_COLORS = ['#FF7B52', '#10332F', '#1967D2', '#2E7D32', '#7C3AED', '#0E7C86', '#C2410C', '#B45309'];
function avColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AV_COLORS[h % AV_COLORS.length];
}

function Avatar({ name }: { name: string }) {
  const c = avColor(name);
  return <span className="av" style={{ color: c, background: `color-mix(in srgb, ${c} 16%, transparent)` }}>{initials(name)}</span>;
}

/* ---------------- Status (Durum) dropdown ---------------- */
export function StatusDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const cls = value ? STATUS_CLS[value] : '';
  return (
    <>
      <button
        ref={ref}
        className="cell-trigger"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {value
          ? <span className={'status-pill st-' + cls}><span className="st-dot" />{value}</span>
          : <span className="ph">Durum</span>}
        <span className="caret">▾</span>
      </button>
      <Popover anchorRef={ref} open={open} onClose={() => setOpen(false)} minWidth={184}>
        <div className="pop-list" role="listbox">
          {DURUM_OPTIONS.map((o) => (
            <button key={o} className={'pop-opt' + (o === value ? ' sel' : '')} onClick={() => { onChange(o); setOpen(false); }}>
              <span className={'status-pill st-' + STATUS_CLS[o]}><span className="st-dot" />{o}</span>
              {o === value && <span className="pop-check">✓</span>}
            </button>
          ))}
          {value && <button className="pop-opt muted" onClick={() => { onChange(''); setOpen(false); }}>✕ Temizle</button>}
        </div>
      </Popover>
    </>
  );
}

/* ---------------- Assignee (Sorumlu) combobox ---------------- */
export function AssigneeCombobox({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const filtered = q.trim() ? options.filter((o) => trLower(o).includes(trLower(q))) : options;
  const canAdd = q.trim().length > 0 && !options.some((o) => trLower(o) === trLower(q.trim()));

  const close = () => { setOpen(false); setQ(''); };
  const pick = (v: string) => { onChange(v); close(); };

  return (
    <>
      <button
        ref={ref}
        className="cell-trigger assignee-trigger"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {value
          ? <span className="assignee-chip"><Avatar name={value} />{value}</span>
          : <span className="ph">Atanmadı</span>}
        <span className="caret">▾</span>
      </button>
      <Popover anchorRef={ref} open={open} onClose={close} minWidth={224}>
        <div className="pop-combo">
          <input
            autoFocus
            className="pop-search"
            placeholder="Ara veya yeni yaz…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && q.trim()) { e.preventDefault(); pick(q.trim()); }
            }}
          />
          <div className="pop-list" role="listbox">
            {filtered.map((o) => (
              <button key={o} className={'pop-opt' + (o === value ? ' sel' : '')} onClick={() => pick(o)}>
                <span className="assignee-chip"><Avatar name={o} />{o}</span>
                {o === value && <span className="pop-check">✓</span>}
              </button>
            ))}
            {canAdd && (
              <button className="pop-opt add" onClick={() => pick(q.trim())}>
                <span className="add-ic">＋</span> “{q.trim()}” ekle
              </button>
            )}
            {!filtered.length && !canAdd && <div className="pop-empty">Eşleşen kişi yok</div>}
            {value && <button className="pop-opt muted" onClick={() => pick('')}>✕ Atamayı kaldır</button>}
          </div>
        </div>
      </Popover>
    </>
  );
}
