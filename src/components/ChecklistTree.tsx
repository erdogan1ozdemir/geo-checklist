import { Fragment } from 'react';
import { Checkbox } from './Checkbox';
import { fieldVal, EditField } from './EditFields';
import { StatusDropdown, AssigneeCombobox } from './Pickers';
import { groupState, leafIds, priClass, splitPhaseTitle, splitSectionTitle } from '../lib/util';
import type { EditsMap, Section, SheetData, Subtask, Task } from '../data/types';

export interface TreeCtx {
  selected: Set<string>;
  edits: EditsMap;
  setMany: (ids: string[], on: boolean) => void;
  toggleId: (id: string) => void;
  onEdit: (id: string, field: EditField, value: string) => void;
  applyToSubtasks: (task: Task, field: EditField) => void;
  sorumluOptions: string[];
  setSorumlu: (id: string, value: string) => void;
  openTasks: Set<string>;
  toggleTask: (id: string) => void;
  openSections: Set<string>;
  toggleSection: (id: string) => void;
  searchActive: boolean;
  vis: Map<string, { visible: boolean; matchedSub: Set<string> }>;
}

function pct(a: number, b: number) { return b === 0 ? 0 : Math.round((a / b) * 100); }

function ApplyDown({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="apply-down"
      title="Bu değeri tüm alt görevlere uygula"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >⤓</button>
  );
}

/* ---------------- Task row ---------------- */
function TaskTRow({ task, ctx, open }: { task: Task; ctx: TreeCtx; open: boolean }) {
  const hasSubs = task.subtasks.length > 0;
  const ids = leafIds(task);
  const gState = hasSubs ? groupState(ctx.selected, ids) : (ctx.selected.has(task.id) ? 'all' : 'none');
  const selCount = ids.filter((id) => ctx.selected.has(id)).length;
  const edit = ctx.edits[task.id];

  return (
    <div className={'ctrow task' + (selCount ? ' sel' : '')}>
      <div className="cc cbx-cell"><Checkbox state={gState} onChange={() => ctx.setMany(ids, gState !== 'all')} label={task.aksiyon} /></div>
      <div className="cc chev-cell">
        {hasSubs && (
          <button className={'tchev' + (open ? ' open' : '')} onClick={() => ctx.toggleTask(task.id)} aria-expanded={open} aria-label={open ? 'Kapat' : 'Aç'}>▶</button>
        )}
      </div>
      <div className="cc gorev">
        <div className="g-name" onClick={hasSubs ? () => ctx.toggleTask(task.id) : undefined} style={hasSubs ? { cursor: 'pointer' } : undefined}>
          <span>{task.aksiyon}</span>
          {hasSubs && <span className="sub-badge">{selCount ? `${selCount}/${ids.length}` : `${task.subtasks.length} adım`}</span>}
        </div>
        <div className="g-tags">
          {task.gorevTipi && <span className="tag tip">{task.gorevTipi}</span>}
          {task.kanal && <span className="tag kanal">{task.kanal}</span>}
          {task.arac && task.arac !== '-' && <span className="tag arac" title={task.arac}>🧰 {task.arac}</span>}
        </div>
        {task.detay && <div className="g-detay" title={task.detay}>{task.detay}</div>}
      </div>
      <div className="cc oncelik">{task.oncelik && <span className={'pri ' + priClass(task.oncelik)}>{task.oncelik}</span>}</div>
      <div className="cc edit">
        <AssigneeCombobox value={fieldVal(task.sorumlu, edit, 'sorumlu')} options={ctx.sorumluOptions} onChange={(v) => ctx.setSorumlu(task.id, v)} />
        {hasSubs && <ApplyDown onClick={() => ctx.applyToSubtasks(task, 'sorumlu')} />}
      </div>
      <div className="cc edit">
        <StatusDropdown value={fieldVal(task.durum, edit, 'durum')} onChange={(v) => ctx.onEdit(task.id, 'durum', v)} />
        {hasSubs && <ApplyDown onClick={() => ctx.applyToSubtasks(task, 'durum')} />}
      </div>
      <div className="cc edit">
        <input className="cellfld" value={fieldVal(task.markaNotlari, edit, 'markaNotlari')} placeholder="Marka notu…" onChange={(e) => ctx.onEdit(task.id, 'markaNotlari', e.target.value)} />
        {hasSubs && <ApplyDown onClick={() => ctx.applyToSubtasks(task, 'markaNotlari')} />}
      </div>
    </div>
  );
}

/* ---------------- Subtask row ---------------- */
function SubTRow({ st, ctx }: { st: Subtask; ctx: TreeCtx }) {
  const sel = ctx.selected.has(st.id);
  const edit = ctx.edits[st.id];
  const action = st.aksiyon.replace(/^→\s*/, '');
  return (
    <div className={'ctrow sub' + (sel ? ' sel' : '')}>
      <div className="cc cbx-cell"><Checkbox state={sel} onChange={() => ctx.toggleId(st.id)} small label={action} /></div>
      <div className="cc chev-cell"><span className="sub-marker">↳</span></div>
      <div className="cc gorev">
        <div className="g-name sub">{action}</div>
        {st.detay && <div className="g-detay" title={st.detay}>{st.detay}</div>}
      </div>
      <div className="cc oncelik"><span className="muted-dash">·</span></div>
      <div className="cc edit"><AssigneeCombobox value={fieldVal(st.sorumlu, edit, 'sorumlu')} options={ctx.sorumluOptions} onChange={(v) => ctx.setSorumlu(st.id, v)} /></div>
      <div className="cc edit"><StatusDropdown value={fieldVal(st.durum, edit, 'durum')} onChange={(v) => ctx.onEdit(st.id, 'durum', v)} /></div>
      <div className="cc edit"><input className="cellfld" value={fieldVal(st.markaNotlari, edit, 'markaNotlari')} placeholder="Marka notu…" onChange={(e) => ctx.onEdit(st.id, 'markaNotlari', e.target.value)} /></div>
    </div>
  );
}

/* ---------------- Section ---------------- */
function SectionGroup({ section, ctx }: { section: Section; ctx: TreeCtx }) {
  const tasks = section.tasks.filter((t) => ctx.vis.get(t.id)?.visible);
  if (!tasks.length) return null;
  const { emoji, text } = splitSectionTitle(section.title);
  const ids = tasks.flatMap((t) => leafIds(t));
  const gState = groupState(ctx.selected, ids);
  const sel = ids.filter((id) => ctx.selected.has(id)).length;
  const open = ctx.openSections.has(section.id);

  return (
    <div className={'section' + (open ? ' open' : '')}>
      <div className="section-head" onClick={() => ctx.toggleSection(section.id)} role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ctx.toggleSection(section.id); } }}>
        <span className="chev">▶</span>
        <span className="s-emoji">{emoji}</span>
        <span className="s-title">{text}</span>
        <div className="s-meta">
          <span className="s-count">{sel > 0 ? `${sel}/${ids.length}` : `${ids.length} madde`}</span>
          <span className="s-prog"><span className="f" style={{ width: pct(sel, ids.length) + '%' }} /></span>
          <span className="s-selall"><Checkbox state={gState} onChange={() => ctx.setMany(ids, gState !== 'all')} small label="Bölümü seç" /></span>
        </div>
      </div>
      {open && (
        <div className="ctbl-wrap">
          <div className="ctbl">
            <div className="ctbl-head">
              <div className="cc" /><div className="cc" />
              <div className="cc th">Görev</div>
              <div className="cc th">Öncelik</div>
              <div className="cc th">Sorumlu</div>
              <div className="cc th">Durum</div>
              <div className="cc th">Marka Notu</div>
            </div>
            {tasks.map((task) => {
              const v = ctx.vis.get(task.id);
              const forced = ctx.searchActive && !!v && v.matchedSub.size > 0;
              const topen = ctx.openTasks.has(task.id) || forced;
              return (
                <Fragment key={task.id}>
                  <TaskTRow task={task} ctx={ctx} open={topen} />
                  {topen && task.subtasks.map((st) => <SubTRow key={st.id} st={st} ctx={ctx} />)}
                </Fragment>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Tree root ---------------- */
export function ChecklistTree({ sheet, ctx }: { sheet: SheetData; ctx: TreeCtx }) {
  const phases = sheet.phases.filter((p) => p.sections.some((s) => s.tasks.some((t) => ctx.vis.get(t.id)?.visible)));

  if (!phases.length) {
    return (
      <div className="empty">
        <div className="ei">🔍</div>
        <div className="et">Sonuç bulunamadı</div>
        <div className="ed">Arama veya filtre kriterlerine uyan madde yok. Filtreyi sıfırlamayı deneyin.</div>
      </div>
    );
  }

  return (
    <div>
      {phases.map((phase) => {
        const visTasks = phase.sections.flatMap((s) => s.tasks.filter((t) => ctx.vis.get(t.id)?.visible));
        const ids = visTasks.flatMap((t) => leafIds(t));
        const gState = groupState(ctx.selected, ids);
        const sel = ids.filter((id) => ctx.selected.has(id)).length;
        const { num, text } = splitPhaseTitle(phase.title);
        return (
          <section key={phase.id}>
            <div className="phase">
              <span className="p-num">{num}</span>
              <span className="p-title">{text}</span>
              <div className="p-prog">
                <span>{sel}/{ids.length}</span>
                <span className="pp-track"><span className="pp-fill" style={{ width: pct(sel, ids.length) + '%' }} /></span>
                <Checkbox state={gState} onChange={() => ctx.setMany(ids, gState !== 'all')} small label="Fazı seç" />
              </div>
            </div>
            {phase.sections.map((section) => <SectionGroup key={section.id} section={section} ctx={ctx} />)}
          </section>
        );
      })}
    </div>
  );
}
