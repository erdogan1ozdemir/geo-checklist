import type { SheetName } from '../data/types';

interface Props {
  active: SheetName;
  onChange: (s: SheetName) => void;
  counts: Record<SheetName, { total: number; selected: number }>;
}

const TABS: { key: SheetName; label: string; icon: string }[] = [
  { key: 'E-Ticaret', label: 'E-Ticaret', icon: '🛒' },
  { key: 'Hizmet', label: 'Hizmet', icon: '🛠️' },
];

export function Tabs({ active, onChange, counts }: Props) {
  return (
    <nav className="tabs" role="tablist" aria-label="Checklist tipi">
      {TABS.map((t) => {
        const c = counts[t.key];
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={active === t.key}
            className={'tab' + (active === t.key ? ' active' : '')}
            onClick={() => onChange(t.key)}
          >
            <span>{t.icon}</span>
            {t.label}
            <span className="badge">{c.selected > 0 ? `${c.selected}/${c.total}` : c.total}</span>
          </button>
        );
      })}
    </nav>
  );
}
