import { DURUM_OPTIONS } from '../lib/xlsxExport.js';
import type { ItemEdit } from '../data/types';

export type EditField = 'durum' | 'sorumlu' | 'markaNotlari';

interface DurumProps {
  value: string;
  onChange: (v: string) => void;
  compact?: boolean;
}

export function DurumSelect({ value, onChange, compact }: DurumProps) {
  return (
    <select
      className={'fld' + (value ? ' durum-set' : '') + (compact ? '' : '')}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={compact ? { width: 'auto', minWidth: 130 } : undefined}
      onClick={(e) => e.stopPropagation()}
    >
      <option value="">Durum…</option>
      {DURUM_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
    </select>
  );
}

/** Resolve the displayed value for an editable field (override ?? original). */
export function fieldVal(original: string, edit: ItemEdit | undefined, field: EditField): string {
  const o = edit?.[field];
  return o != null ? o : original;
}
