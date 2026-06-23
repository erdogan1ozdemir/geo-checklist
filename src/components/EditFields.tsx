import type { ItemEdit } from '../data/types';

export type EditField = 'durum' | 'sorumlu' | 'markaNotlari';

/** Resolve the displayed value for an editable field (override ?? original). */
export function fieldVal(original: string, edit: ItemEdit | undefined, field: EditField): string {
  const o = edit?.[field];
  return o != null ? o : original;
}
