interface Props {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onExport: () => void;
  exportDisabled: boolean;
  selectedCount: number;
}

export function Topbar({ theme, onToggleTheme, onExport, exportDisabled, selectedCount }: Props) {
  return (
    <header className="topbar">
      <div className="brand">
        <img className="brand-logo" src="./brand/inbound-wordmark.png" alt="Inbound" />
        <span className="brand-divider" />
        <div className="title-block">
          <span className="subtitle">Inbound · GEO / AEO</span>
          <span className="title">Kontrol Listesi</span>
        </div>
      </div>
      <div className="spacer" />
      <button className="ctrl ghost" onClick={onToggleTheme} title="Tema değiştir">
        <span className="ico">{theme === 'dark' ? '☀️' : '🌙'}</span>
        <span className="lbl">{theme === 'dark' ? 'Açık' : 'Koyu'}</span>
      </button>
      <button className="ctrl export" onClick={onExport} disabled={exportDisabled} title="Seçili maddeleri Excel olarak indir">
        <span className="ico">⬇</span>
        <span className="lbl">Export</span>
        {selectedCount > 0 && <span style={{ fontWeight: 700 }}>({selectedCount})</span>}
      </button>
    </header>
  );
}
