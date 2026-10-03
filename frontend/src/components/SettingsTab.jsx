import { Home, LogOut, Plus, Settings, WalletCards } from 'lucide-react';
import { LABELS } from '../constants';
import { money, num } from '../utils';
import { Field } from './common';

export function SettingsTab({
  settings, setSettings, tariffs, tariffMonth, setTariffMonth,
  activeTariff, onSaveSettings, onSaveTariff, onUpdateTariff, onLogout
}) {
  return (
    <>
      <section className="card">
        <h2><Home />Mieszkanie</h2>
        <div className="grid">
          <Field label="Adres / nazwa" value={settings.apartment} onChange={v => setSettings({ ...settings, apartment: v })} />
          <Field label="Powierzchnia m²" value={settings.area} type="number" onChange={v => setSettings({ ...settings, area: num(v) })} />
          <Field label="Liczba osób" value={settings.residents} type="number" onChange={v => setSettings({ ...settings, residents: num(v) })} />
          <Field label="Cel wody m³/os./mies." value={settings.waterGoalPerPerson ?? ''} type="number" step="0.1" onChange={v => setSettings({ ...settings, waterGoalPerPerson: num(v) })} />
        </div>
        <button className="secondary" onClick={onSaveSettings}>Zapisz dane</button>
        <button className="secondary logout" onClick={onLogout}><LogOut size={16} />Wyloguj się</button>
      </section>

      <section className="card">
        <h2><WalletCards />Płatność</h2>
        <p>Dane odbiorcy do kodu QR — zeskanujesz go w aplikacji banku i zapłacisz jednym kliknięciem.</p>
        <div className="grid">
          <Field label="Odbiorca (nazwa)" value={settings.payeeName} onChange={v => setSettings({ ...settings, payeeName: v })} />
          <Field label="Numer konta / IBAN" value={settings.payeeIban} onChange={v => setSettings({ ...settings, payeeIban: v.replace(/\s/g, '').toUpperCase() })} />
          <Field label="Tytuł przelewu (opcjonalnie)" value={settings.paymentNote} onChange={v => setSettings({ ...settings, paymentNote: v })} />
          <label>Waluta przelewu
            <select value={settings.paymentCurrency || 'EUR'} onChange={e => setSettings({ ...settings, paymentCurrency: e.target.value })}>
              <option value="EUR">EUR (Austria / SEPA)</option>
              <option value="PLN">PLN (Polska)</option>
            </select>
          </label>
        </div>
        <button className="secondary" onClick={onSaveSettings}>Zapisz dane</button>
      </section>

      <section className="card">
        <div className="cardHead">
          <div><h2><Settings />Taryfy</h2><p>Zmiana obowiązuje od wybranego miesiąca. Stare miesiące pozostają bez zmian.</p></div>
          <button className="add" onClick={onSaveTariff}><Plus size={17} />Dodaj / zapisz</button>
        </div>
        <label className="wide">Taryfikator od miesiąca
          <input type="month" value={tariffMonth} onChange={e => setTariffMonth(e.target.value)} />
        </label>
        <div className="grid">
          {Object.entries(LABELS).map(([key, label]) => (
            <Field
              key={key}
              label={label + (key.includes('PerM2') ? ' zł/m²' : key.includes('PerPerson') ? ' zł/os.' : key === 'cleaning' ? ' zł/lokal' : ' zł/jedn.')}
              value={activeTariff[key]}
              type="number"
              step="0.01"
              onChange={v => onUpdateTariff(key, v)}
            />
          ))}
        </div>
        <div className="tariffHistory">
          <b>Historia zmian</b>
          {[...tariffs].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom)).map(t => (
            <div key={t.effectiveFrom}>
              <span>Od {t.effectiveFrom}</span>
              <small>{money(t.values.coldWater)}/m³ woda · {money(t.values.sewage)}/m³ ścieki</small>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
