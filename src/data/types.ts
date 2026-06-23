export type SheetName = 'E-Ticaret' | 'Hizmet';

export interface Subtask {
  id: string;
  row: number;
  kind: 'subtask';
  faz: string;
  gorevTipi: string;
  kanal: string;
  aksiyon: string;
  detay: string;
  arac: string;
  oncelik: string;
  sorumlu: string;
  durum: string;
  markaNotlari: string;
  inboundNotlari: string;
}

export interface Task extends Omit<Subtask, 'kind'> {
  kind: 'task';
  subtasks: Subtask[];
}

export interface Section {
  id: string;
  row: number;
  title: string;
  tasks: Task[];
}

export interface Phase {
  id: string;
  row: number;
  title: string;
  sections: Section[];
}

export interface SheetData {
  sheet: SheetName;
  sheetFile: string;
  title: string;
  meta: string;
  phases: Phase[];
  counts: { phase: number; section: number; task: number; subtask: number };
  maxRow: number;
}

export type Checklist = Record<SheetName, SheetData>;

/** Per-item user edits (only fields the user actually changed are present). */
export interface ItemEdit {
  sorumlu?: string;
  durum?: string;
  markaNotlari?: string;
}

export type EditsMap = Record<string, ItemEdit>; // keyed by item id
