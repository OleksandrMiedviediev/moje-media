import { useEffect, useMemo, useState } from 'react';
import { BarChart3, ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react';
import { money, monthLabel, num } from '../utils';
import { Empty, Row } from './common';

const PAGE_SIZES = [5, 10, 20, 50];

export function HistoryTab({ entries, sortedEntries, settings, onEdit, onRemove }) {
  const [expanded, setExpanded] = useState(null);
  const [chartMode, setChartMode] = useState(() => localStorage.getItem('mb-chart-mode') || 'months');
  const [yearFilter, setYearFilter] = useState(() => localStorage.getItem('mb-history-year') || 'all');
  const [pageSize, setPageSize] = useState(() => Number(localStorage.getItem('mb-history-page-size')) || 10);
  const [page, setPage] = useState(0);

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
        if (!byYear[y]) byYear[y] = { label: y, usage: 0, total: 0, count: 0 };
        byYear[y].usage += num(e.usage);
        byYear[y].total += num(e.total);
        byYear[y].count++;
      });
      return Object.values(byYear).sort((a, b) => a.label.localeCompare(b.label));
    }
    return [...sortedEntries].reverse().map(e => ({
      label: `${e.month.slice(5)}.${e.month.slice(2, 4)}`,
      usage: num(e.usage),
      total: num(e.total),
      month: e.month
    }));
  }, [sortedEntries, chartMode]);

  const maxUsage = Math.max(1, goal, ...chartData.map(d => d.usage));
  const barMaxH = 150;
  const labelH = 22; // место под значением столбика, чтобы не обрезалось

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
          </div>
        </div>
        <div className="chartScroll">
          <div className="chart" style={{ height: `${barMaxH + labelH + 44}px` }}>
            {chartData.map(d => (
              <div className="barWrap" key={d.label}>
                <div className={`bar${goal && d.usage > goal ? ' over' : ''}`} title={`${d.usage.toFixed(2)} m³ · ${money(d.total)}`} style={{ height: `${Math.max(8, d.usage / maxUsage * barMaxH)}px` }}>
                  <span>{d.usage.toFixed(1)}</span>
                </div>
                <small>{d.label}</small>
                <small className="barTotal">{d.total.toFixed(0)} zł</small>
              </div>
            ))}
          </div>
        </div>
        {goal > 0 && <div className="goalInfo">Cel: {goal.toFixed(1).replace('.', ',')} m³/mies. ({num(settings.waterGoalPerPerson).toFixed(1).replace('.', ',')} m³ × {num(settings.residents)} os.) — czerwone słupki przekraczają cel.</div>}
      </section>

      <section className="card">
        <h2>Historia rozliczeń</h2>
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
                      <Row name="Woda" value={e.breakdown?.water} />
                      <Row name="Ścieki" value={e.breakdown?.sewage} />
                      <Row name="Pozostałe" value={num(e.total) - num(e.breakdown?.water) - num(e.breakdown?.sewage)} />
                      <div className="actions">
                        <button onClick={() => onEdit(e)}><Pencil size={16} />Edytuj</button>
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
    </>
  );
}
