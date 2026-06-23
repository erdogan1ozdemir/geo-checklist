import { useEffect, useMemo, useState } from 'react';
import rawData from './data/checklist.json';
import type { Checklist, EditsMap, SheetData, SheetName, Task } from './data/types';
import {
  EMPTY_FILTERS, Filters, allTaskIds, facetValues, leafIds, priRank,
  splitPhaseTitle, taskMatches, totalItems, usePersistentSet, usePersistentState,
} from './lib/util';
import { buildFilteredWorkbook } from './lib/xlsxExport.js';
import { computeExportPlan } from './lib/selection.js';
import { fieldVal, EditField } from './components/EditFields';
import { Topbar } from './components/Topbar';
import { Tabs } from './components/Tabs';
import { KpiStrip, Stats } from './components/KpiStrip';
import { FilterBar } from './components/FilterBar';
import { ChecklistTree, TreeCtx } from './components/ChecklistTree';

const data = rawData as unknown as Checklist;
const SHEETS: SheetName[] = ['E-Ticaret', 'Hizmet'];

const ALL_SECTION_IDS = SHEETS.flatMap((s) => data[s].phases.flatMap((p) => p.sections.map((sec) => sec.id)));

// Distinct "Sorumlu" values already present in the data — the seed dropdown list.
const SEED_SORUMLU = (() => {
  const set = new Set<string>();
  for (const sn of SHEETS) for (const p of data[sn].phases) for (const s of p.sections) for (const t of s.tasks) {
    if (t.sorumlu && t.sorumlu.trim()) set.add(t.sorumlu.trim());
    for (const st of t.subtasks) if (st.sorumlu && st.sorumlu.trim()) set.add(st.sorumlu.trim());
  }
  return Array.from(set);
})();

const PRI_META = [
  { label: 'Kritik', cls: 'kritik', color: '#D32F2F' },
  { label: 'Yüksek', cls: 'yuksek', color: '#F5A623' },
  { label: 'Orta', cls: 'orta', color: '#E0A800' },
  { label: 'Düşük', cls: 'dusuk', color: '#5FA36F' },
];

function buildEditsByRow(sheet: SheetData, edits: EditsMap): Record<number, EditsMap[string]> {
  const out: Record<number, EditsMap[string]> = {};
  for (const p of sheet.phases) for (const s of p.sections) for (const t of s.tasks) {
    if (edits[t.id]) out[t.row] = edits[t.id];
    for (const st of t.subtasks) if (edits[st.id]) out[st.row] = edits[st.id];
  }
  return out;
}

function todayStr(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export default function App() {
  const [theme, setTheme] = usePersistentState<'light' | 'dark'>('geo.theme', 'light');
  const [activeSheet, setActiveSheet] = usePersistentState<SheetName>('geo.sheet', 'E-Ticaret');
  const [selected, updateSelected] = usePersistentSet('geo.selected');
  const [edits, setEdits] = usePersistentState<EditsMap>('geo.edits', {});
  const [openSections, updateOpenSections] = usePersistentSet('geo.openSections', ALL_SECTION_IDS);
  const [openTasks, updateOpenTasks] = usePersistentSet('geo.openTasks');
  const [extraSorumlu, setExtraSorumlu] = usePersistentState<string[]>('geo.sorumluOptions', []);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [toast, setToast] = useState<string | null>(null);

  const sorumluOptions = useMemo(
    () => Array.from(new Set([...SEED_SORUMLU, ...extraSorumlu])).sort((a, b) => a.localeCompare(b, 'tr')),
    [extraSorumlu],
  );

  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); }, [theme]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2600); return () => clearTimeout(t); }, [toast]);

  const sheet = data[activeSheet];
  const facets = useMemo(() => facetValues(sheet), [sheet]);

  // visibility map for active sheet
  const vis = useMemo(() => {
    const m = new Map<string, { visible: boolean; matchedSub: Set<string> }>();
    for (const p of sheet.phases) for (const s of p.sections) for (const t of s.tasks) {
      m.set(t.id, taskMatches(t, filters, selected));
    }
    return m;
  }, [sheet, filters, selected]);

  const searchActive = filters.search.trim().length > 0;

  // selection helpers
  const toggleId = (id: string) => updateSelected((s) => { s.has(id) ? s.delete(id) : s.add(id); return s; });
  const setMany = (ids: string[], on: boolean) => updateSelected((s) => { for (const id of ids) on ? s.add(id) : s.delete(id); return s; });
  const onEdit = (itemId: string, field: EditField, value: string) => {
    setEdits((prev) => ({ ...prev, [itemId]: { ...prev[itemId], [field]: value } }));
  };
  const setSorumlu = (itemId: string, value: string) => {
    onEdit(itemId, 'sorumlu', value);
    const v = value.trim();
    if (v && !SEED_SORUMLU.includes(v)) setExtraSorumlu((prev) => (prev.includes(v) ? prev : [...prev, v]));
  };
  const applyToSubtasks = (task: import('./data/types').Task, field: EditField) => {
    if (!task.subtasks.length) return;
    const val = fieldVal((task as Record<EditField, string>)[field], edits[task.id], field);
    setEdits((prev) => {
      const next = { ...prev };
      for (const st of task.subtasks) next[st.id] = { ...next[st.id], [field]: val };
      return next;
    });
    const labels: Record<EditField, string> = { durum: 'Durum', sorumlu: 'Sorumlu', markaNotlari: 'Marka Notu' };
    setToast(`${labels[field]} → ${task.subtasks.length} alt göreve uygulandı`);
  };

  const ctx: TreeCtx = {
    selected, edits, setMany, toggleId, onEdit, applyToSubtasks, sorumluOptions, setSorumlu,
    openTasks, toggleTask: (id) => updateOpenTasks((s) => { s.has(id) ? s.delete(id) : s.add(id); return s; }),
    openSections, toggleSection: (id) => updateOpenSections((s) => { s.has(id) ? s.delete(id) : s.add(id); return s; }),
    searchActive, vis,
  };

  // visible selectable ids (active sheet, passing filter)
  const visibleLeafIds = useMemo(() => {
    const ids: string[] = [];
    for (const p of sheet.phases) for (const s of p.sections) for (const t of s.tasks) {
      if (vis.get(t.id)?.visible) ids.push(...leafIds(t));
    }
    return ids;
  }, [sheet, vis]);

  // stats for active sheet
  const stats: Stats = useMemo(() => {
    const total = totalItems(sheet);
    let selCount = 0; let tasksTotal = 0; let tasksSel = 0;
    const priTotals: Record<string, number> = {}; const priSel: Record<string, number> = {};
    const phaseAgg = sheet.phases.map((p) => ({ num: splitPhaseTitle(p.title).num, total: 0, selected: 0 }));
    sheet.phases.forEach((p, pi) => {
      for (const s of p.sections) for (const t of s.tasks) {
        tasksTotal++;
        const ids = leafIds(t);
        const sc = ids.filter((id) => selected.has(id)).length;
        selCount += sc;
        if (selected.has(t.id)) tasksSel++;
        const pr = t.oncelik || 'Düşük';
        priTotals[pr] = (priTotals[pr] || 0) + 1;
        if (selected.has(t.id)) priSel[pr] = (priSel[pr] || 0) + 1;
        phaseAgg[pi].total += ids.length;
        phaseAgg[pi].selected += sc;
      }
    });
    const byPriority = PRI_META.map((pm) => ({ ...pm, total: priTotals[pm.label] || 0, selected: priSel[pm.label] || 0 }))
      .filter((x) => x.total > 0)
      .sort((a, b) => priRank(a.label) - priRank(b.label));
    return { total, selected: selCount, tasksTotal, tasksSelected: tasksSel, byPriority, phases: phaseAgg };
  }, [sheet, selected]);

  const tabCounts = useMemo(() => {
    const out = {} as Record<SheetName, { total: number; selected: number }>;
    for (const sn of SHEETS) {
      const sd = data[sn];
      const all = allTaskIds(sd);
      out[sn] = { total: totalItems(sd), selected: all.filter((id) => selected.has(id)).length };
    }
    return out;
  }, [selected]);

  const resultCount = useMemo(() => {
    let n = 0; for (const v of vis.values()) if (v.visible) n++; return n;
  }, [vis]);

  const activeSelectedCount = tabCounts[activeSheet].selected;
  const totalSelectedAll = SHEETS.reduce((acc, sn) => acc + tabCounts[sn].selected, 0);

  // export
  const onExport = async () => {
    const sheetsWithSel = SHEETS.filter((sn) => allTaskIds(data[sn]).some((id) => selected.has(id)));
    if (!sheetsWithSel.length) { setToast('Önce en az bir madde seçin'); return; }
    try {
      const res = await fetch('./GEO-AEO-Checklist-v5.xlsx');
      const buf = new Uint8Array(await res.arrayBuffer());
      const exportsList = sheetsWithSel.map((sn) => {
        const sd = data[sn];
        const editsByRow = buildEditsByRow(sd, edits);
        const plan = computeExportPlan(sd, selected, editsByRow);
        return { sheetName: sd.sheet, sheetFile: sd.sheetFile, keepRows: plan.keepRows, edits: plan.edits };
      });
      const bytes = buildFilteredWorkbook(buf, exportsList) as Uint8Array;
      const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const tag = sheetsWithSel.length === SHEETS.length ? 'Tum' : sheetsWithSel[0];
      a.href = url;
      a.download = `GEO-AEO-Checklist-${tag}-${todayStr()}.xlsx`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      setToast(`${totalSelectedAll} madde Excel'e aktarıldı`);
    } catch (e) {
      console.error(e);
      setToast('Export sırasında hata oluştu');
    }
  };

  return (
    <div className="app">
      <Topbar
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        onExport={onExport}
        exportDisabled={totalSelectedAll === 0}
        selectedCount={totalSelectedAll}
      />
      <Tabs active={activeSheet} onChange={setActiveSheet} counts={tabCounts} />
      <main className="content">
        <KpiStrip stats={stats} />
        <FilterBar
          filters={filters}
          facets={facets}
          onChange={setFilters}
          onSelectAllVisible={() => setMany(visibleLeafIds, true)}
          onClearAll={() => setMany(allTaskIds(sheet), false)}
          visibleSelectable={visibleLeafIds.length}
          hasSelection={activeSelectedCount > 0}
          resultCount={resultCount}
        />
        <ChecklistTree sheet={sheet} ctx={ctx} />
      </main>

      <a className="footer-logo" href="https://inbound.com.tr" target="_blank" rel="noreferrer" title="Inbound">
        <img src="./brand/inbound-wordmark.png" alt="Inbound" />
      </a>
      <button className="scroll-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} title="Yukarı çık">↑</button>

      {toast && <div className="toast">✓ {toast}</div>}
    </div>
  );
}
