import { Checkbox } from './Checkbox';
import { TaskRow } from './TaskRow';
import { groupState, leafIds, splitPhaseTitle, splitSectionTitle } from '../lib/util';
import type { EditsMap, SheetData, Section, Task } from '../data/types';

export interface TreeCtx {
  selected: Set<string>;
  edits: EditsMap;
  setMany: (ids: string[], on: boolean) => void;
  toggleId: (id: string) => void;
  onEdit: (id: string, field: 'durum' | 'sorumlu' | 'markaNotlari', value: string) => void;
  openTasks: Set<string>;
  toggleTask: (id: string) => void;
  openSections: Set<string>;
  toggleSection: (id: string) => void;
  searchActive: boolean;
  vis: Map<string, { visible: boolean; matchedSub: Set<string> }>;
}

function visibleTasksOf(section: Section, ctx: TreeCtx): Task[] {
  return section.tasks.filter((t) => ctx.vis.get(t.id)?.visible);
}

function leafIdsOfTasks(tasks: Task[]): string[] {
  return tasks.flatMap((t) => leafIds(t));
}

function pct(a: number, b: number) { return b === 0 ? 0 : Math.round((a / b) * 100); }

function SectionGroup({ section, ctx }: { section: Section; ctx: TreeCtx }) {
  const tasks = visibleTasksOf(section, ctx);
  if (!tasks.length) return null;
  const { emoji, text } = splitSectionTitle(section.title);
  const ids = leafIdsOfTasks(tasks);
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
        <div className="section-body">
          {tasks.map((task) => {
            const v = ctx.vis.get(task.id);
            const forced = ctx.searchActive && !!v && v.matchedSub.size > 0;
            const isOpen = ctx.openTasks.has(task.id) || forced;
            return (
              <TaskRow
                key={task.id}
                task={task}
                selected={ctx.selected}
                open={isOpen}
                onToggleOpen={() => ctx.toggleTask(task.id)}
                onToggleGroup={() => { const tids = leafIds(task); ctx.setMany(tids, groupState(ctx.selected, tids) !== 'all'); }}
                onToggleSubtask={(id) => ctx.toggleId(id)}
                edits={ctx.edits}
                onEdit={ctx.onEdit}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ChecklistTree({ sheet, ctx }: { sheet: SheetData; ctx: TreeCtx }) {
  const phases = sheet.phases.filter((p) => p.sections.some((s) => visibleTasksOf(s, ctx).length > 0));

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
        const visTasks = phase.sections.flatMap((s) => visibleTasksOf(s, ctx));
        const ids = leafIdsOfTasks(visTasks);
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
