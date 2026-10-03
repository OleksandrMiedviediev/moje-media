import { useMemo, useState } from 'react';
import { BarChart3, ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react';
import { money, monthLabel, num } from '../utils';
import { Empty, Row } from './common';

export function HistoryTab({ entries, sortedEntries, settings, onEdit, onRemove }) {
  const [expanded, setExpanded] = useState(null);
  const [chartMode, setChartMode] = useState('months');

  const annual = sortedEntries.reduce((s, e) => s + num(e.total), 0);
  const avg = sortedEntries.length ? annual / sortedEntries.length : 0;
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
        {sortedEntries.length === 0 ? <Empty /> : (
          <div className="history">
            {sortedEntries.map(e => (
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
        )}
      </section>
    </>
  );
}
