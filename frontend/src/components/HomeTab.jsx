import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Droplets, QrCode, WalletCards, X } from 'lucide-react';
import { calc, money, monthLabel, num, zbpQrPayload } from '../utils';
import { Row } from './common';

export function PayQrModal({ settings, total, month, onClose }) {
  const [qr, setQr] = useState('');
  useEffect(() => {
    const note = settings.paymentNote || `Media ${settings.apartment} ${month}`;
    const payload = zbpQrPayload({ name: settings.payeeName, iban: settings.payeeIban, amount: total, note, nip: settings.payeeNip });
    QRCode.toDataURL(payload, { width: 260, margin: 1 })
      .then(setQr).catch(() => setQr(''));
  }, [settings, total, month]);
  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modal card" onClick={e => e.stopPropagation()}>
        <div className="cardHead"><h2><QrCode />Zapłać QR</h2><button className="eye" onClick={onClose}><X size={18} /></button></div>
        <p className="authSub">Zeskanuj w aplikacji banku (George, mBank, PKO…) — kwota i odbiorca wypełnią się same.</p>
        {qr && <img className="qrImg" src={qr} alt="QR płatności" />}
        <div className="grand"><span>{settings.payeeName}</span><b>{money(total)}</b></div>
        <small className="qrMonth">{monthLabel(month)}</small>
      </div>
    </div>
  );
}

export function HomeTab({
  month, setMonth, water, setWater, editing, setEditing,
  previousWater, settings, selectedTariff, onSave, savedEntry, customReadings, setCustomReadings
}) {
  const [newMeterWater, setNewMeterWater] = useState(false);
  const [newMeters, setNewMeters] = useState({}); // id => true для кастомных счётчиков
  const result = calc(water, newMeterWater ? 0 : previousWater, settings, selectedTariff, customReadings, newMeters);
  const [showQr, setShowQr] = useState(false);
  const meters = (settings.customItems || []).filter(i => i.active && i.type === 'meter');
  // После сохранения (поле пустое, не в режиме редактирования) — показываем сохранённую сумму
  const justSaved = savedEntry && !water && !editing;
  const displayTotal = justSaved ? num(savedEntry.total) : result.total;
  const canPay = settings.payeeIban && settings.payeeName && displayTotal > 0;

  const waterLower = water.trim() && !isNaN(num(water)) && num(water) < num(previousWater);

  // Валидация: вода — число; если меньше предыдущего — нужно подтверждение нового счётчика
  const validate = () => {
    if (!water.trim()) return 'Wpisz aktualne wskazanie wody.';
    if (isNaN(num(water))) return 'Wskazanie wody musi być liczbą.';
    if (waterLower && !newMeterWater) return 'Wskazanie mniejsze niż poprzednie — potwierdź nowy licznik poniżej.';
    for (const m of meters) {
      const v = customReadings[m.id];
      if (v !== undefined && v !== '' && isNaN(num(v))) return `„${m.name}” musi być liczbą.`;
      const lower = v !== undefined && v !== '' && num(v) < num(m.lastValue);
      if (lower && !newMeters[m.id]) return `„${m.name}” mniejsze niż poprzedni stan — potwierdź nowy licznik.`;
    }
    return null;
  };
  const validationError = validate();

  return (
    <>
      <section className="hero card">
        <div>
          <span>DO ZAPŁATY</span>
          <strong>{money(displayTotal)}</strong>
          <small>{monthLabel(month)}{justSaved && ' · zapisane ✓'}</small>
        </div>
        <div className="heroIcon"><WalletCards size={28} /></div>
      </section>
      {canPay && <button className="primary payBtn" onClick={() => setShowQr(true)}><QrCode size={18} />Zapłać — pokaż kod QR</button>}
      {showQr && <PayQrModal settings={settings} total={displayTotal} month={month} onClose={() => setShowQr(false)} />}

      <section className="card">
        <div className="cardHead">
          <div><h2><Droplets />Woda</h2><p>Podaj tylko aktualne wskazanie.</p></div>
          <input className="month" type="month" value={month} onChange={e => { setMonth(e.target.value); setEditing(null); setWater(''); }} />
        </div>
        <div className="waterGrid">
          <label>Poprzednie wskazanie<input value={String(previousWater).replace('.', ',')} readOnly /></label>
          <label>Aktualne wskazanie<input autoFocus inputMode="decimal" value={water} onChange={e => setWater(e.target.value)} placeholder="np. 128,7" /></label>
        </div>
        {waterLower && (
          <label className="checkRow">
            <input type="checkbox" checked={newMeterWater} onChange={e => setNewMeterWater(e.target.checked)} />
            <span>Wymieniono licznik — wskazanie nowe, zużycie od zera</span>
          </label>
        )}
        <div className="usage">
          <div><span>Zużycie</span><b>{result.usage.toFixed(2).replace('.', ',')} m³</b></div>
          <div><span>Woda + ścieki</span><b>{money(result.variable)}</b></div>
        </div>
        {editing && <div className="editNotice">Edytujesz {monthLabel(month)}. Po zapisaniu stare wyliczenie zostanie zastąpione.</div>}
      </section>

      {meters.length > 0 && (
        <section className="card">
          <h2>Pozostałe liczniki</h2>
          <div className="waterGrid">
            {meters.map(m => {
              const v = customReadings[m.id];
              const lower = v !== undefined && v !== '' && !isNaN(num(v)) && num(v) < num(m.lastValue);
              return (
                <div key={m.id}>
                  <label>{m.name || 'Licznik'} ({m.unit})
                    <input
                      inputMode="decimal"
                      value={v ?? ''}
                      onChange={e => setCustomReadings({ ...customReadings, [m.id]: e.target.value })}
                      placeholder={`poprz. ${num(m.lastValue).toFixed(2)}`}
                    />
                  </label>
                  {lower && (
                    <label className="checkRow">
                      <input type="checkbox" checked={!!newMeters[m.id]} onChange={e => setNewMeters({ ...newMeters, [m.id]: e.target.checked })} />
                      <span>Nowy licznik — zużycie od zera</span>
                    </label>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

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
          {Object.values(result.custom).length > 0 && <div className="separator" />}
          {Object.entries(result.custom).map(([id, c]) => (
            <Row key={id} name={c.name + (c.usage !== undefined ? ` (${c.usage.toFixed(2).replace('.', ',')} ${c.unit})` : '')} value={c.cost} />
          ))}
        </div>
        <div className="grand"><span>RAZEM</span><b>{money(result.total)}</b></div>
      </section>

      {validationError && <div className="authErr" style={{ margin: '0 14px 10px' }}>{validationError}</div>}
      <button className="primary" onClick={() => onSave(result)} disabled={!!validationError}>{editing ? 'Zapisz zmiany' : 'Zapisz miesiąc'}</button>
    </>
  );
}

export function entryPayload(month, previousWater, water, result, selectedTariff, customReadings = {}) {
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
