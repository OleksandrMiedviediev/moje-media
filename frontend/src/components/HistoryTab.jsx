import { useEffect, useMemo, useState } from 'react';
import { BarChart3, ChevronDown, ChevronUp, Download, Pencil, QrCode, Trash2 } from 'lucide-react';
import { money, monthLabel, num } from '../utils';
import { Empty, Row } from './common';
import { PayQrModal } from './HomeTab';

const PAGE_SIZES = [5, 10, 20, 50];

const exportCSV = (entries, settings) => {
  const headers = ['Miesiąc', 'Poprzednie wskazanie', 'Aktualne wskazanie', 'Zużycie m³', 'Zimna woda', 'Ścieki', 'Śmieci', 'Konserwacja', 'Administracja', 'Sprzątanie', 'Światło klatki', 'Fundusz remontowy', 'Dodatkowe', 'Razem zł'];
  const rows = entries.map(e => {
    const customTotal = Object.values(e.custom || {}).reduce((s, c) => s + num(c.cost), 0);
    return [
      e.month,
      num(e.previousWater).toFixed(2),
      num(e.currentWater).toFixed(2),
      num(e.usage).toFixed(2),
      num(e.breakdown?.water).toFixed(2),
      num(e.breakdown?.sewage).toFixed(2),
      num(e.breakdown?.waste).toFixed(2),
      num(e.breakdown?.maintenance).toFixed(2),
      num(e.breakdown?.administration).toFixed(2),
      num(e.breakdown?.cleaning).toFixed(2),
      num(e.breakdown?.light).toFixed(2),
      num(e.breakdown?.renovation).toFixed(2),
      customTotal.toFixed(2),
      num(e.total).toFixed(2)
    ];
  });
  const csv = [headers, ...rows].map(r => r.join(';')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `moje-media-${settings?.name || 'eksport'}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

export function HistoryTab({ entries, sortedEntries, settings, onEdit, onRemove }) {
  const [expanded, setExpanded] = useState(null);
  const [chartMode, setChartMode] = useState(() => localStorage.getItem('mb-chart-mode') || 'months');
  const [yearFilter, setYearFilter] = useState(() => localStorage.getItem('mb-history-year') || 'all');
  const [pageSize, setPageSize] = useState(() => Number(localStorage.getItem('mb-history-page-size')) || 10);
  const [page, setPage] = useState(0);
  const [payFor, setPayFor] = useState(null);

  const canPay = settings?.payeeIban && settings?.payeeName;

  useEffect(() => localStorage.setItem('mb-chart-mode', chartMode), [chartMode]);
  useEffect(() => localStorage.setItem('mb-history-year', yearFilter), [yearFilter]);
  useEffect(() => localStorage.setItem('mb-history-page-size', String(pageSize)), [pageSize]);

  const years = useMemo(() => [...new Set(sortedEntries.map(e => e.month.slice(0, 4)))], [sortedEntries]);
  const filtered = useMemo(() => yearFilter === 'all' ? sortedEntries : sortedEntries.filter(e => e.month.startsWith(yearFilter)), [sortedEntries, yearFilter]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageItems = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize);

  const annual = filtered.reduce((s, e) => s + num(e.total), 0);
  const avg = filtered.length ? annual / filtered.length : 0;
  const goal = num(settings?.waterGoalPerPerson) * num(settings?.residents);

  const chartData = useMemo(() => {
    if (chartMode === 'years') {
      const byYear = {};
      sortedEntries.forEach(e => {
        const y = e.month.slice(0, 4);
        if (!byYear[y]) byYear[y] = { label: y, usage: 0, total: 0, count: 0, segments: { water: 0, sewage: 0, fixed: 0, custom: 0 } };
        byYear[y].usage += num(e.usage);
        byYear[y].total += num(e.total);
        byYear[y].count++;
        byYear[y].segments.water += num(e.breakdown?.water);
        byYear[y].segments.sewage += num(e.breakdown?.sewage);
        byYear[y].segments.fixed += num(e.breakdown?.waste) + num(e.breakdown?.maintenance) + num(e.breakdown?.administration) + num(e.breakdown?.cleaning) + num(e.breakdown?.light) + num(e.breakdown?.renovation);
        byYear[y].segments.custom += Object.values(e.custom || {}).reduce((s, c) => s + num(c.cost), 0);
      });
      return Object.values(byYear).sort((a, b) => a.label.localeCompare(b.label));
    }
    if (chartMode === 'yoy') {
      // Сравнение год к году: группируем по месяцу (01-12), внутри — года
      const byMonth = {};
      sortedEntries.forEach(e => {
        const m = e.month.slice(5);
        const y = e.month.slice(0, 4);
        if (!byMonth[m]) byMonth[m] = {};
        byMonth[m][y] = { usage: num(e.usage), total: num(e.total) };
      });
      return Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).map(([m, yearsMap]) => ({
        label: m,
        years: Object.entries(yearsMap).sort(([a], [b]) => a.localeCompare(b))
      }));
    }
    return [...sortedEntries].reverse().map(e => ({
      label: `${e.month.slice(5)}.${e.month.slice(2, 4)}`,
      usage: num(e.usage),
      total: num(e.total),
      month: e.month,
      segments: {
        water: num(e.breakdown?.water),
        sewage: num(e.breakdown?.sewage),
        fixed: num(e.breakdown?.waste) + num(e.breakdown?.maintenance) + num(e.breakdown?.administration) + num(e.breakdown?.cleaning) + num(e.breakdown?.light) + num(e.breakdown?.renovation),
        custom: Object.values(e.custom || {}).reduce((s, c) => s + num(c.cost), 0)
      }
    }));
  }, [sortedEntries, chartMode]);

  const maxUsage = Math.max(1, goal, ...chartData.map(d => d.usage ?? Math.max(...(d.years || []).map(([, v]) => v.usage), 0)));
  const maxTotal = Math.max(1, ...chartData.map(d => d.total ?? Math.max(...(d.years || []).map(([, v]) => v.total), 0)));
  const barMaxH = 150;
  const labelH = 22;
  const yoyYears = [...new Set(sortedEntries.map(e => e.month.slice(0, 4)))].sort();

  return (
    <>
      <section className="card stats">
        <div><span>Łącznie</span><b>{money(annual)}</b></div>
        <div><span>Średnio / miesiąc</span><b>{money(avg)}</b></div>
        <div><span>Miesięcy</span><b>{entries.length}</b></div>
      </section>

      <section className="card">
        <div className="cardHead">
          <div>
            <h2><BarChart3 />Zużycie wody</h2>
            <p>{chartMode === 'months' ? 'Wszystkie zapisane miesiące — przewiń w bok' : 'Sumarycznie według lat'}</p>
          </div>
          <div className="chartTabs">
            <button className={chartMode === 'months' ? 'active' : ''} onClick={() => setChartMode('months')}>Miesiące</button>
            <button className={chartMode === 'years' ? 'active' : ''} onClick={() => setChartMode('years')}>Lata</button>
            <button className={chartMode === 'costs' ? 'active' : ''} onClick={() => setChartMode('costs')}>Koszty</button>
            <button className={chartMode === 'yoy' ? 'active' : ''} onClick={() => setChartMode('yoy')}>Rok do roku</button>
          </div>
        </div>
        <div className="chartScroll">
          <div className="chart" style={{ height: `${barMaxH + labelH + 44}px` }}>
            {chartData.map(d => {
              if (chartMode === 'yoy') {
                return (
                  <div className="barWrap yoyWrap" key={d.label}>
                    <div className="yoyBars">
                      {d.years.map(([year, val]) => (
                        <div
                          key={year}
                          className="bar"
                          title={`${year}: ${val.usage.toFixed(2)} m³ · ${money(val.total)}`}
                          style={{ height: `${Math.max(8, val.usage / maxUsage * barMaxH)}px`, background: year === yoyYears[yoyYears.length - 1] ? '#356ae6' : '#a5b8d4' }}
                        >
                          <span>{val.usage.toFixed(1)}</span>
                        </div>
                      ))}
                    </div>
                    <small>{d.label}</small>
                    <small className="barTotal">{d.years.map(([y, v]) => `${y.slice(2)}: ${v.total.toFixed(0)}`).join(' ')} zł</small>
                  </div>
                );
              }
              if (chartMode === 'costs') {
                const total = Math.max(1, d.total);
                const segs = [
                  { key: 'water', val: d.segments.water, color: '#3b82f6', name: 'Woda' },
                  { key: 'sewage', val: d.segments.sewage, color: '#06b6d4', name: 'Ścieki' },
                  { key: 'fixed', val: d.segments.fixed, color: '#f59e0b', name: 'Opłaty stałe' },
                  { key: 'custom', val: d.segments.custom, color: '#a855f7', name: 'Dodatkowe' }
                ].filter(s => s.val > 0);
                return (
                  <div className="barWrap" key={d.label}>
                    <div className="barStack" title={segs.map(s => `${s.name}: ${money(s.val)}`).join('\n')} style={{ height: `${Math.max(8, total / maxTotal * barMaxH)}px` }}>
                      {segs.map(s => <div key={s.key} style={{ height: `${(s.val / total) * 100}%`, background: s.color }} />)}
                      <span>{d.total.toFixed(0)}</span>
                    </div>
                    <small>{d.label}</small>
                    <small className="barTotal">{d.total.toFixed(0)} zł</small>
                  </div>
                );
              }
              return (
                <div className="barWrap" key={d.label}>
                  <div className={`bar${goal && d.usage > goal ? ' over' : ''}`} title={`${d.usage.toFixed(2)} m³ · ${money(d.total)}`} style={{ height: `${Math.max(8, d.usage / maxUsage * barMaxH)}px` }}>
                    <span>{d.usage.toFixed(1)}</span>
                  </div>
                  <small>{d.label}</small>
                  <small className="barTotal">{d.total.toFixed(0)} zł</small>
                </div>
              );
            })}
          </div>
        </div>
        {chartMode === 'yoy' && (
          <div className="legend">
            {yoyYears.map((y, i) => (
              <span key={y}><i style={{ background: i === yoyYears.length - 1 ? '#356ae6' : '#a5b8d4' }} />{y}</span>
            ))}
          </div>
        )}
        {chartMode === 'costs' && (
          <div className="legend">
            <span><i style={{ background: '#3b82f6' }} />Woda</span>
            <span><i style={{ background: '#06b6d4' }} />Ścieki</span>
            <span><i style={{ background: '#f59e0b' }} />Opłaty stałe</span>
            <span><i style={{ background: '#a855f7' }} />Dodatkowe</span>
          </div>
        )}
        {goal > 0 && chartMode !== 'costs' && <div className="goalInfo">Cel: {goal.toFixed(1).replace('.', ',')} m³/mies. ({num(settings.waterGoalPerPerson).toFixed(1).replace('.', ',')} m³ × {num(settings.residents)} os.) — czerwone słupki przekraczają cel.</div>}
      </section>

      <section className="card">
        <div className="cardHead">
          <div><h2>Historia rozliczeń</h2></div>
          <button className="secondary exportBtn" onClick={() => exportCSV(filtered, settings)} title="Pobierz CSV">
            <Download size={15} />CSV
          </button>
        </div>
        <div className="filters">
          <select value={yearFilter} onChange={e => { setYearFilter(e.target.value); setPage(0); }}>
            <option value="all">Wszystkie lata</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(0); }}>
            {PAGE_SIZES.map(n => <option key={n} value={n}>{n} na stronę</option>)}
          </select>
        </div>
        {filtered.length === 0 ? <Empty /> : (
          <>
            <div className="history">
              {pageItems.map(e => (
                <div className="historyItem" key={e.month}>
                  <button className="historyMain" onClick={() => setExpanded(expanded === e.month ? null : e.month)}>
                    <div>
                      <b>{monthLabel(e.month)}</b>
                      <small>{num(e.usage).toFixed(2).replace('.', ',')} m³ wody</small>
                    </div>
                    <strong>{money(e.total)}</strong>
                    {expanded === e.month ? <ChevronUp /> : <ChevronDown />}
                  </button>
                  {expanded === e.month && (
                    <div className="historyDetails">
                    <div className="meterRow">
                      <div><span>Poprzednie</span><b>{num(e.previousWater).toFixed(2).replace('.', ',')} m³</b></div>
                      <div><span>Aktualne</span><b>{num(e.currentWater).toFixed(2).replace('.', ',')} m³</b></div>
                      <div><span>Zużycie</span><b>{num(e.usage).toFixed(2).replace('.', ',')} m³</b></div>
                    </div>
                    <Row name="Zimna woda" value={e.breakdown?.water} />
                    <Row name="Ścieki" value={e.breakdown?.sewage} />
                    <div className="separator" />
                    <Row name="Śmieci" value={e.breakdown?.waste} />
                    <Row name="Konserwacja" value={e.breakdown?.maintenance} />
                    <Row name="Administracja" value={e.breakdown?.administration} />
                    <Row name="Sprzątanie klatek" value={e.breakdown?.cleaning} />
                    <Row name="Światło klatki" value={e.breakdown?.light} />
                    <Row name="Fundusz remontowy" value={e.breakdown?.renovation} />
                    {e.custom && Object.keys(e.custom).length > 0 && <div className="separator" />}
                    {e.custom && Object.entries(e.custom).map(([id, c]) => (
                      <Row key={id} name={c.name + (c.usage !== undefined ? ` (${c.usage.toFixed(2).replace('.', ',')} ${c.unit})` : '')} value={c.cost} />
                    ))}
                      <div className="actions">
                        <button onClick={() => onEdit(e)}><Pencil size={16} />Edytuj</button>
                        {canPay && <button onClick={() => setPayFor(e)}><QrCode size={16} />Zapłać</button>}
                        <button className="danger" onClick={() => onRemove(e)}><Trash2 size={16} />Usuń</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {pageCount > 1 && (
              <div className="pagination">
                <button disabled={safePage === 0} onClick={() => setPage(0)}>«</button>
                <button disabled={safePage === 0} onClick={() => setPage(p => p - 1)}>‹</button>
                <span>{safePage + 1} / {pageCount}</span>
                <button disabled={safePage >= pageCount - 1} onClick={() => setPage(p => p + 1)}>›</button>
                <button disabled={safePage >= pageCount - 1} onClick={() => setPage(pageCount - 1)}>»</button>
              </div>
            )}
          </>
        )}
      </section>

      {payFor && (
        <PayQrModal
          settings={settings}
          total={num(payFor.total)}
          month={payFor.month}
          onClose={() => setPayFor(null)}
        />
      )}
    </>
  );
}
