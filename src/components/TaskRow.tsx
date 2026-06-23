import { Checkbox } from './Checkbox';
import { SubtaskRow } from './SubtaskRow';
import { DurumSelect, fieldVal } from './EditFields';
import { groupState, leafIds, priClass } from '../lib/util';
import type { EditsMap, ItemEdit, Task } from '../data/types';

interface Props {
  task: Task;
  selected: Set<string>;
  open: boolean;
  onToggleOpen: () => void;
  onToggleGroup: () => void;
  onToggleSubtask: (id: string) => void;
  edits: EditsMap;
  onEdit: (itemId: string, field: 'durum' | 'sorumlu' | 'markaNotlari', value: string) => void;
}

export function TaskRow({ task, selected, open, onToggleOpen, onToggleGroup, onToggleSubtask, edits, onEdit }: Props) {
  const hasSubs = task.subtasks.length > 0;
  const ids = leafIds(task);
  const gState = hasSubs ? groupState(selected, ids) : (selected.has(task.id) ? 'all' : 'none');
  const selCount = ids.filter((id) => selected.has(id)).length;
  const anySel = selCount > 0;
  const edit: ItemEdit | undefined = edits[task.id];

  return (
    <div className={'task' + (anySel ? ' sel' : '')}>
      <div className="task-main">
        <button
          className={'t-chev' + (open ? ' open' : '') + (hasSubs ? '' : ' empty')}
          onClick={onToggleOpen}
          aria-label={open ? 'Kapat' : 'Aç'}
          aria-expanded={open}
        >▶</button>
        <Checkbox state={gState} onChange={onToggleGroup} label={task.aksiyon} />
        <div className="t-body" onClick={hasSubs ? onToggleOpen : undefined} style={hasSubs ? { cursor: 'pointer' } : undefined}>
          <div className="t-titlerow">
            <span className="t-action">{task.aksiyon}</span>
            {hasSubs && (
              <span className="t-sub-count" title={`${task.subtasks.length} alt görev`}>
                {selCount > 0 ? `${selCount}/${ids.length}` : `${task.subtasks.length} adım`}
              </span>
            )}
          </div>
          <div className="t-meta">
            {task.oncelik && <span className={'pri ' + priClass(task.oncelik)}>{task.oncelik}</span>}
            {task.gorevTipi && <span className="chip tip">{task.gorevTipi}</span>}
            {task.kanal && <span className="chip kanal">{task.kanal}</span>}
            {task.sorumlu && <span className="chip">👤 {fieldVal(task.sorumlu, edit, 'sorumlu')}</span>}
            {task.arac && task.arac !== '-' && <span className="chip arac">🧰 {task.arac}</span>}
          </div>
        </div>
      </div>

      {open && (
        <>
          <div className="t-extra">
            {task.detay && <div className="t-detay">{task.detay}</div>}
            <div className="t-fields">
              <span className="fl">Durum</span>
              <div className="fv"><DurumSelect value={fieldVal(task.durum, edit, 'durum')} onChange={(v) => onEdit(task.id, 'durum', v)} compact /></div>
              <span className="fl">Sorumlu</span>
              <div className="fv"><input className="fld" style={{ maxWidth: 280 }} value={fieldVal(task.sorumlu, edit, 'sorumlu')} placeholder="Sorumlu…" onChange={(e) => onEdit(task.id, 'sorumlu', e.target.value)} /></div>
              <span className="fl">Marka Notları</span>
              <div className="fv"><textarea className="fld" placeholder="Bu madde için marka notu…" value={fieldVal(task.markaNotlari, edit, 'markaNotlari')} onChange={(e) => onEdit(task.id, 'markaNotlari', e.target.value)} /></div>
            </div>
          </div>

          {hasSubs && (
            <div className="subtasks">
              {task.subtasks.map((st) => (
                <SubtaskRow
                  key={st.id}
                  st={st}
                  selected={selected.has(st.id)}
                  onToggle={() => onToggleSubtask(st.id)}
                  edit={edits[st.id]}
                  onEdit={(field, value) => onEdit(st.id, field, value)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
