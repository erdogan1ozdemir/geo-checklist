import { Checkbox } from './Checkbox';
import { DurumSelect, fieldVal } from './EditFields';
import type { ItemEdit, Subtask } from '../data/types';

interface Props {
  st: Subtask;
  selected: boolean;
  onToggle: () => void;
  edit: ItemEdit | undefined;
  onEdit: (field: 'durum' | 'markaNotlari', value: string) => void;
}

export function SubtaskRow({ st, selected, onToggle, edit, onEdit }: Props) {
  const action = st.aksiyon.replace(/^→\s*/, '');
  return (
    <div className={'subtask' + (selected ? ' sel' : '')}>
      <Checkbox state={selected} onChange={onToggle} small label={action} />
      <div className="st-body">
        <div className="st-action">{action}</div>
        {st.detay && <div className="st-detay">{st.detay}</div>}
        {selected && (
          <div className="st-edit">
            <DurumSelect value={fieldVal(st.durum, edit, 'durum')} onChange={(v) => onEdit('durum', v)} compact />
            <input
              className="fld"
              placeholder="Marka notu…"
              value={fieldVal(st.markaNotlari, edit, 'markaNotlari')}
              onChange={(e) => onEdit('markaNotlari', e.target.value)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
