import { useCallback, useEffect, useState } from 'react';
import type { SheetData, Task, Subtask, Phase } from '../data/types';

/* ---------------- localStorage-backed state ---------------- */
export function usePersistentState<T>(key: string, initial: T): [T, (v: T | ((p: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw != null) return JSON.parse(raw) as T;
    } catch {
      /* ignore */
    }
    return initial;
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      /* ignore quota / private mode */
    }
  }, [key, state]);
  return [state, setState as (v: T | ((p: T) => T)) => void];
}

/** A Set persisted as an array in localStorage. */
export function usePersistentSet(key: string, initial: string[] = []): [Set<string>, (updater: (s: Set<string>) => Set<string>) => void, (next: Set<string>) => void] {
  const [arr, setArr] = usePersistentState<string[]>(key, initial);
  const set = new Set(arr);
  const update = useCallback((updater: (s: Set<string>) => Set<string>) => {
    setArr((prev) => Array.from(updater(new Set(prev))));
  }, [setArr]);
  const replace = useCallback((next: Set<string>) => setArr(Array.from(next)), [setArr]);
  return [set, update, replace];
}

/* ---------------- tree helpers ---------------- */
export interface FlatItem {
  task: Task;
  subtasks: Subtask[];
}

/** All exportable line-item ids of a task (the task line + its subtasks). */
export function leafIds(task: Task): string[] {
  return [task.id, ...task.subtasks.map((s) => s.id)];
}

export function allTaskIds(sheet: SheetData): string[] {
  const ids: string[] = [];
  for (const p of sheet.phases) for (const s of p.sections) for (const t of s.tasks) ids.push(...leafIds(t));
  return ids;
}

export function totalItems(sheet: SheetData): number {
  return sheet.counts.task + sheet.counts.subtask;
}

/** group state of a set of ids against a selection */
export type GroupState = 'none' | 'some' | 'all';
export function groupState(selected: Set<string>, ids: string[]): GroupState {
  let on = 0;
  for (const id of ids) if (selected.has(id)) on++;
  if (on === 0) return 'none';
  if (on === ids.length) return 'all';
  return 'some';
}

/* ---------------- priority ---------------- */
const PRI_ORDER: Record<string, number> = { 'Kritik': 0, 'Yüksek': 1, 'Orta': 2, 'Düşük': 3, '': 4 };
export function priClass(p: string): string {
  switch (p) {
    case 'Kritik': return 'kritik';
    case 'Yüksek': return 'yuksek';
    case 'Orta': return 'orta';
    case 'Düşük': return 'dusuk';
    default: return 'dusuk';
  }
}
export function priRank(p: string): number {
  return PRI_ORDER[p] ?? 5;
}

/** Split a section title like "📋 1. Mevcut Durum…" into emoji + text. */
export function splitSectionTitle(title: string): { emoji: string; text: string } {
  const m = title.match(/^(\p{Extended_Pictographic}[️‍\p{Extended_Pictographic}]*)\s*(.*)$/u);
  if (m) return { emoji: m[1], text: m[2] };
  return { emoji: '📌', text: title };
}

/** Extract "FAZ 1" + rest from a phase banner title. */
export function splitPhaseTitle(title: string): { num: string; text: string } {
  const m = title.match(/^(FAZ\s*\d+)\s*[-–]\s*(.*)$/i);
  if (m) return { num: m[1].toUpperCase().replace(/\s+/, ' '), text: m[2] };
  return { num: 'FAZ', text: title };
}

/* ---------------- filters ---------------- */
export interface Filters {
  search: string;
  faz: string[];
  gorevTipi: string[];
  oncelik: string[];
  kanal: string[];
  onlySelected: boolean;
}

export const EMPTY_FILTERS: Filters = { search: '', faz: [], gorevTipi: [], oncelik: [], kanal: [], onlySelected: false };

function norm(s: string): string {
  return s.toLocaleLowerCase('tr-TR');
}

export function taskMatches(task: Task, f: Filters, selected: Set<string>): { visible: boolean; matchedSub: Set<string> } {
  const matchedSub = new Set<string>();
  // facet filters (task-level)
  if (f.faz.length && !f.faz.includes(task.faz)) return { visible: false, matchedSub };
  if (f.gorevTipi.length && !f.gorevTipi.includes(task.gorevTipi)) return { visible: false, matchedSub };
  if (f.oncelik.length && !f.oncelik.includes(task.oncelik || '—')) {
    // allow empty priority under "—" bucket only if selected
    if (!(task.oncelik === '' && f.oncelik.includes('—'))) return { visible: false, matchedSub };
  }
  if (f.kanal.length && !f.kanal.includes(task.kanal || '—')) {
    if (!(task.kanal === '' && f.kanal.includes('—'))) return { visible: false, matchedSub };
  }
  if (f.onlySelected) {
    const any = leafIds(task).some((id) => selected.has(id));
    if (!any) return { visible: false, matchedSub };
  }
  // search
  const q = f.search.trim();
  if (q) {
    const nq = norm(q);
    const inTask = [task.aksiyon, task.detay, task.arac, task.sorumlu, task.kanal, task.gorevTipi]
      .some((v) => norm(v).includes(nq));
    let inSub = false;
    for (const st of task.subtasks) {
      if (norm(st.aksiyon).includes(nq) || norm(st.detay).includes(nq)) {
        matchedSub.add(st.id);
        inSub = true;
      }
    }
    if (!inTask && !inSub) return { visible: false, matchedSub };
  }
  return { visible: true, matchedSub };
}

/* ---------------- facet option building ---------------- */
export function facetValues(sheet: SheetData): { faz: string[]; gorevTipi: string[]; oncelik: string[]; kanal: string[] } {
  const faz = new Set<string>(); const gt = new Set<string>(); const onc = new Set<string>(); const kn = new Set<string>();
  for (const p of sheet.phases) for (const s of p.sections) for (const t of s.tasks) {
    if (t.faz) faz.add(t.faz);
    if (t.gorevTipi) gt.add(t.gorevTipi);
    onc.add(t.oncelik || '—');
    kn.add(t.kanal || '—');
  }
  const ordPri = (a: string, b: string) => priRank(a === '—' ? '' : a) - priRank(b === '—' ? '' : b);
  return {
    faz: [...faz].sort(),
    gorevTipi: [...gt].sort((a, b) => a.localeCompare(b, 'tr')),
    oncelik: [...onc].sort(ordPri),
    kanal: [...kn].sort((a, b) => a.localeCompare(b, 'tr')),
  };
}

export function phaseHasVisible(phase: Phase, vis: Set<string>): boolean {
  return phase.sections.some((s) => s.tasks.some((t) => vis.has(t.id)));
}
