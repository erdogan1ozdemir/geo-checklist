export interface Stats {
  total: number;
  selected: number;
  done: number;
  tasksTotal: number;
  tasksSelected: number;
  coveragePct: number;
  completionPct: number;
  byPriority: { label: string; cls: string; color: string; selected: number; total: number }[];
  phases: { num: string; selected: number; total: number }[];
}

function pct(a: number, b: number) {
  return b === 0 ? 0 : Math.round((a / b) * 100);
}

export function KpiStrip({ stats }: { stats: Stats }) {
  return (
    <div className="kpi-strip">
      <div className="kpi hero">
        <div className="k-label">Tamamlanma</div>
        <div className="k-value">{stats.completionPct}<span style={{ fontSize: 20 }}>%</span></div>
        <div className="k-sub">{stats.done} / {stats.selected} seçili görev tamamlandı</div>
        <div className="k-bar-track"><div className="k-bar-fill" style={{ width: stats.completionPct + '%' }} /></div>
      </div>

      <div className="kpi">
        <div className="k-label">Kapsam</div>
        <div className="k-value">{stats.coveragePct}<span style={{ fontSize: 16 }}>%</span></div>
        <div className="k-sub">{stats.selected} / {stats.total} madde seçili</div>
        <div className="k-bar-track"><div className="k-bar-fill teal" style={{ width: stats.coveragePct + '%' }} /></div>
      </div>

      <div className="kpi">
        <div className="k-label">Seçili Madde</div>
        <div className="k-value">{stats.selected}</div>
        <div className="k-sub">{stats.tasksSelected} ana görev</div>
      </div>

      <div className="kpi">
        <div className="k-label">Önceliğe Göre</div>
        <div className="k-mini" style={{ marginTop: 8 }}>
          {stats.byPriority.map((p) => (
            <span className="seg" key={p.label} title={`${p.label}: ${p.selected}/${p.total} seçili`}>
              <span className="dot" style={{ background: p.color }} />{p.selected}<span style={{ color: 'var(--ink-3)' }}>/{p.total}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="kpi">
        <div className="k-label">Faza Göre</div>
        <div className="k-mini" style={{ marginTop: 8, flexDirection: 'column', gap: 4 }}>
          {stats.phases.map((p) => (
            <span className="seg" key={p.num} style={{ width: '100%' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, minWidth: 44 }}>{p.num}</span>
              <span style={{ flex: 1, height: 5, borderRadius: 99, background: 'var(--line-soft)', overflow: 'hidden' }}>
                <span style={{ display: 'block', height: '100%', width: pct(p.selected, p.total) + '%', background: 'var(--accent)' }} />
              </span>
              <span style={{ color: 'var(--ink-3)', fontSize: 10 }}>{p.selected}/{p.total}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
