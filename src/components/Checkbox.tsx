import type { GroupState } from '../lib/util';

interface Props {
  state: GroupState | boolean;
  onChange: () => void;
  small?: boolean;
  label?: string;
}

export function Checkbox({ state, onChange, small, label }: Props) {
  const checked = state === true || state === 'all';
  const indet = state === 'some';
  return (
    <label className={'cbx' + (small ? ' sm' : '')} onClick={(e) => e.stopPropagation()}>
      <input
        type="checkbox"
        checked={checked}
        ref={(el) => { if (el) el.indeterminate = indet; }}
        onChange={onChange}
        aria-label={label || 'Seç'}
      />
      <span className={'box' + (indet ? ' indet' : '')}>
        {!indet && (
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.5 3.5L13 4.5" /></svg>
        )}
      </span>
    </label>
  );
}
