import { MultiSelect } from './MultiSelect';
import type { Filters } from '../lib/util';

interface Facets { faz: string[]; gorevTipi: string[]; oncelik: string[]; kanal: string[]; }

interface Props {
  filters: Filters;
  facets: Facets;
  onChange: (f: Filters) => void;
  onSelectAllVisible: () => void;
  onClearAll: () => void;
  visibleSelectable: number;
  hasSelection: boolean;
  resultCount: number;
}

const PRI_COLOR: Record<string, string> = {
  'Kritik': '#D32F2F', 'Yüksek': '#F5A623', 'Orta': '#1967D2', 'Düşük': '#8A8A8A', '—': '#8A8A8A',
};

export function FilterBar({ filters, facets, onChange, onSelectAllVisible, onClearAll, visibleSelectable, hasSelection, resultCount }: Props) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });
  const activeFacets = filters.faz.length + filters.gorevTipi.length + filters.oncelik.length + filters.kanal.length;

  return (
    <div className="filterbar">
      <div className="search">
        <span className="ico">🔍</span>
        <input
          placeholder="Aksiyon, detay, araç ara…"
          value={filters.search}
          onChange={(e) => set({ search: e.target.value })}
        />
        {filters.search && <button className="btn" style={{ padding: '2px 8px' }} onClick={() => set({ search: '' })}>✕</button>}
      </div>

      <MultiSelect label="Faz" options={facets.faz.map((v) => ({ value: v, label: v }))} selected={filters.faz} onChange={(v) => set({ faz: v })} />
      <MultiSelect label="Görev Tipi" options={facets.gorevTipi.map((v) => ({ value: v, label: v }))} selected={filters.gorevTipi} onChange={(v) => set({ gorevTipi: v })} />
      <MultiSelect label="Öncelik" options={facets.oncelik.map((v) => ({ value: v, label: v === '—' ? 'Belirsiz' : v, color: PRI_COLOR[v] }))} selected={filters.oncelik} onChange={(v) => set({ oncelik: v })} />
      <MultiSelect label="Kanal" options={facets.kanal.map((v) => ({ value: v, label: v === '—' ? 'Belirsiz' : v }))} selected={filters.kanal} onChange={(v) => set({ kanal: v })} />

      <button className={'btn toggle' + (filters.onlySelected ? ' on' : '')} onClick={() => set({ onlySelected: !filters.onlySelected })}>
        ✓ Sadece seçili
      </button>

      {(activeFacets > 0 || filters.search || filters.onlySelected) && (
        <button className="btn" onClick={() => onChange({ search: '', faz: [], gorevTipi: [], oncelik: [], kanal: [], onlySelected: false })}>
          Filtreyi sıfırla
        </button>
      )}

      <div style={{ flex: 1 }} />
      <span style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 600 }}>{resultCount} görev</span>
      <button className="btn primary" onClick={onSelectAllVisible} disabled={visibleSelectable === 0} title="Görünen tüm maddeleri seç">
        ✓ Tümünü seç
      </button>
      <button className="btn" onClick={onClearAll} disabled={!hasSelection}>Temizle</button>
    </div>
  );
}
