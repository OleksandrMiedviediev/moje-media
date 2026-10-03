import { Droplets, WalletCards } from 'lucide-react';
import { calc, money, monthLabel, num } from '../utils';
import { Row } from './common';

export function HomeTab({
  month, setMonth, water, setWater, editing, setEditing,
  previousWater, settings, selectedTariff, onSave
}) {
  const result = calc(water, previousWater, settings, selectedTariff);

  return (
    <>
      <section className="hero card">
        <div>
          <span>DO ZAPŁATY</span>
          <strong>{money(result.total)}</strong>
          <small>{monthLabel(month)}</small>
        </div>
        <div className="heroIcon"><WalletCards size={28} /></div>
      </section>

      <section className="card">
        <div className="cardHead">
          <div><h2><Droplets />Woda</h2><p>Podaj tylko aktualne wskazanie.</p></div>
          <input className="month" type="month" value={month} onChange={e => { setMonth(e.target.value); setEditing(null); setWater(''); }} />
        </div>
        <div className="waterGrid">
          <label>Poprzednie wskazanie<input value={String(previousWater).replace('.', ',')} readOnly /></label>
          <label>Aktualne wskazanie<input autoFocus inputMode="decimal" value={water} onChange={e => setWater(e.target.value)} placeholder="np. 128,7" /></label>
        </div>
        <div className="usage">
          <div><span>Zużycie</span><b>{result.usage.toFixed(2).replace('.', ',')} m³</b></div>
          <div><span>Woda + ścieki</span><b>{money(result.variable)}</b></div>
        </div>
        {editing && <div className="editNotice">Edytujesz {monthLabel(month)}. Po zapisaniu stare wyliczenie zostanie zastąpione.</div>}
      </section>

      <section className="card">
        <h2>Rozliczenie</h2>
        <div className="rows">
          <Row name="Zimna woda" value={result.breakdown.water} />
          <Row name="Ścieki" value={result.breakdown.sewage} />
          <div className="separator" />
          <Row name="Śmieci" value={result.breakdown.waste} />
          <Row name="Konserwacja" value={result.breakdown.maintenance} />
          <Row name="Administracja" value={result.breakdown.administration} />
          <Row name="Sprzątanie klatek" value={result.breakdown.cleaning} />
          <Row name="Światło klatki" value={result.breakdown.light} />
          <Row name="Fundusz remontowy" value={result.breakdown.renovation} />
        </div>
        <div className="grand"><span>RAZEM</span><b>{money(result.total)}</b></div>
      </section>

      <button className="primary" onClick={() => onSave(result)}>{editing ? 'Zapisz zmiany' : 'Zapisz miesiąc'}</button>
    </>
  );
}

export function entryPayload(month, previousWater, water, result, selectedTariff) {
  return {
    month,
    previousWater: num(previousWater),
    currentWater: num(water),
    usage: result.usage,
    total: result.total,
    breakdown: result.breakdown,
    tariffs: selectedTariff
  };
}
