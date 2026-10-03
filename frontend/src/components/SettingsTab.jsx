import { Home, LogOut, Moon, Plus, Settings, Sun, Trash2, WalletCards } from 'lucide-react';
import { LABELS } from '../constants';
import { money, num } from '../utils';
import { Field } from './common';
import { NotificationsSection } from './NotificationsSection';

const UNITS = ['m³', 'kWh', 'GJ', 'zł'];

export function SettingsTab({
  settings, setSettings, allSettings, apartments, activeApartmentId, onAddApartment, onRemoveApartment,
  tariffs, tariffMonth, setTariffMonth,
  activeTariff, onSaveSettings, onSaveTariff, onUpdateTariff, onDeleteTariff, onLogout, dark, setDark
}) {
  const items = settings.customItems || [];

  const addItem = type => {
    const id = `c${Date.now()}`;
    setSettings({ customItems: [...items, { id, type, name: '', unit: 'm³', rate: 0, amount: 0, active: true, lastValue: 0 }] });
  };

  const updateItem = (id, patch) => {
    setSettings({ customItems: items.map(i => i.id === id ? { ...i, ...patch } : i) });
  };

  const removeItem = async id => {
    const item = items.find(i => i.id === id);
    if (!confirm(`Usunąć „${item?.name || 'pozycję'}”? Stare miesiące zachowają tę pozycję w historii.`)) return;
    const next = items.filter(i => i.id !== id);
    const updatedSettings = { ...settings, customItems: next };
    setSettings({ customItems: next });
    try { await onSaveSettings({ ...allSettings, apartments: allSettings.apartments.map(a => a.id === activeApartmentId ? updatedSettings : a) }); } catch { /* ignore */ }
  };

  // Валидация: название обязательно, числа >= 0
  const validateItems = () => {
    for (const item of items) {
      if (!item.active) continue;
      if (!item.name || !item.name.trim()) return `Podaj nazwę pozycji (${item.type === 'meter' ? 'licznik' : 'stała opłata'})`;
      if (item.type === 'meter' && num(item.rate) < 0) return `Stawka „${item.name}” nie może być ujemna`;
      if (item.type === 'fixed' && num(item.amount) < 0) return `Kwota „${item.name}” nie może być ujemna`;
    }
    return null;
  };
  const itemsError = validateItems();

  return (
    <>
      <section className="card">
        <h2><Home />Mieszkania</h2>
        <p>Zarządzaj adresami — dodaj kolejne mieszkanie lub usuń niepotrzebne.</p>
        <div className="aptList">
          {apartments.map(a => (
            <div className={`aptRow${a.id === activeApartmentId ? ' active' : ''}`} key={a.id}>
              <div>
                <b>{a.name}</b>
                <small>{num(a.area).toFixed(2).replace('.', ',')} m² · {num(a.residents)} os.</small>
              </div>
              {a.id === activeApartmentId && <span className="badge meter">Aktywne</span>}
              {apartments.length > 1 && a.id !== activeApartmentId && (
                <button className="removeBtn" onClick={() => onRemoveApartment(a.id)}><Trash2 size={14} />Usuń</button>
              )}
            </div>
          ))}
        </div>
        <div className="filters">
          <button className="secondary" onClick={() => {
            const name = prompt('Nazwa / adres nowego mieszkania:', 'np. Słoneczna 12 / 4');
            if (name?.trim()) onAddApartment({ name: name.trim(), area: 0, residents: 1, waterGoalPerPerson: 3 });
          }}><Plus size={16} /> Dodaj mieszkanie</button>
          <button className="secondary themeToggle" onClick={() => setDark(d => !d)}>
            {dark ? <Sun size={16} /> : <Moon size={16} />} {dark ? 'Jasny motyw' : 'Ciemny motyw'}
          </button>
        </div>
      </section>

      <section className="card">
        <h2><Home />Aktywne mieszkanie — {settings.name}</h2>
        <div className="grid">
          <Field label="Adres / nazwa" value={settings.name} onChange={v => setSettings({ name: v })} />
          <Field label="Powierzchnia m²" value={settings.area} type="number" onChange={v => setSettings({ area: num(v) })} />
          <Field label="Liczba osób" value={settings.residents} type="number" onChange={v => setSettings({ residents: num(v) })} />
          <Field label="Cel wody m³/os./mies." value={settings.waterGoalPerPerson ?? ''} type="number" step="0.1" onChange={v => setSettings({ waterGoalPerPerson: num(v) })} />
        </div>
        <button className="secondary" onClick={onSaveSettings}>Zapisz dane</button>
        <button className="secondary logout" onClick={onLogout}><LogOut size={16} />Wyloguj się</button>
      </section>

      <section className="card">
        <div className="cardHead">
          <div><h2><Plus />Dodatkowe pozycje</h2><p>Liczniki (ciepła woda, gaz, prąd…) lub stałe opłaty (internet, TV…).</p></div>
        </div>
        {items.length === 0 && <p className="authSub" style={{ margin: '8px 0 12px' }}>Brak dodatkowych pozycji. Dodaj licznik lub stałą opłatę.</p>}
        {items.map(item => (
          <div className="customItem" key={item.id}>
            <div className="customHead">
              <span className={`badge ${item.type}`}>{item.type === 'meter' ? 'Licznik' : 'Stała'}</span>
              <button className="removeBtn" onClick={() => removeItem(item.id)}><Trash2 size={14} />Usuń</button>
            </div>
            <div className="grid">
              <Field label="Nazwa" value={item.name} onChange={v => updateItem(item.id, { name: v })} />
              <label>Jednostka
                <select value={item.unit} onChange={e => updateItem(item.id, { unit: e.target.value })}>
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </label>
              {item.type === 'meter' ? (
                <>
                  <Field label="Stawka zł/jedn." value={item.rate} type="number" step="0.01" onChange={v => updateItem(item.id, { rate: num(v) })} />
                  <Field label="Poprzedni stan" value={item.lastValue} type="number" step="0.01" onChange={v => updateItem(item.id, { lastValue: num(v) })} />
                </>
              ) : (
                <Field label="Kwota zł/mies." value={item.amount} type="number" step="0.01" onChange={v => updateItem(item.id, { amount: num(v) })} />
              )}
            </div>
          </div>
        ))}
        <div className="filters">
          <button className="secondary" onClick={() => addItem('meter')}><Plus size={15} /> Licznik</button>
          <button className="secondary" onClick={() => addItem('fixed')}><Plus size={15} /> Stała opłata</button>
        </div>
        {itemsError && <div className="authErr">{itemsError}</div>}
        <button className="secondary" onClick={onSaveSettings} disabled={!!itemsError}>Zapisz dane</button>
      </section>

      <section className="card">
        <h2><WalletCards />Płatność</h2>
        <p>Dane odbiorcy do kodu QR — zeskanujesz go w aplikacji banku i zapłacisz jednym kliknięciem.</p>
        <div className="grid">
          <Field label="Odbiorca (nazwa)" value={settings.payeeName} onChange={v => setSettings({ ...settings, payeeName: v })} />
          <Field label="Numer konta / IBAN" value={settings.payeeIban} onChange={v => setSettings({ ...settings, payeeIban: v.replace(/\s/g, '').toUpperCase() })} />
          <Field label="NIP odbiorcy (jeśli jest)" value={settings.payeeNip} onChange={v => setSettings({ ...settings, payeeNip: v.replace(/\D/g, '') })} />
          <Field label="Tytuł przelewu (opcjonalnie)" value={settings.paymentNote} onChange={v => setSettings({ ...settings, paymentNote: v })} />
        </div>
        <button className="secondary" onClick={onSaveSettings}>Zapisz dane</button>
      </section>

      <NotificationsSection settings={settings} setSettings={setSettings} onSaveSettings={onSaveSettings} />

      <section className="card">
        <div className="cardHead">
          <div><h2><Settings />Taryfy</h2><p>Zmiana obowiązuje od wybranego miesiąca. Stare miesiące pozostają bez zmian.</p></div>
          <button className="add" onClick={onSaveTariff}><Plus size={17} />Dodaj / zapisz</button>
        </div>
        <label className="wide">Taryfikator od miesiąca
          <input type="month" value={tariffMonth} onChange={e => setTariffMonth(e.target.value)} />
        </label>
        <div className="grid">
          {Object.entries(LABELS).filter(([key]) => activeTariff[key]?.active !== false).map(([key, label]) => (
            <div key={key} className="tariffField">
              <Field
                label={label + (key.includes('PerM2') ? ' zł/m²' : key.includes('PerPerson') ? ' zł/os.' : key === 'cleaning' ? ' zł/lokal' : ' zł/jedn.')}
                value={activeTariff[key]?.value ?? activeTariff[key]}
                type="number"
                step="0.01"
                onChange={v => onUpdateTariff(key, v)}
              />
              <button className="removeBtn tariffRemove" onClick={() => onUpdateTariff(key, { ...(activeTariff[key]?.value !== undefined ? activeTariff[key] : { value: activeTariff[key] }), active: false })} title="Usuń pozycję">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
        {Object.entries(LABELS).some(([key]) => activeTariff[key]?.active === false) && (
          <div className="authSub" style={{ marginTop: '10px', fontSize: '12px' }}>
            Ukryte pozycje: {Object.entries(LABELS).filter(([key]) => activeTariff[key]?.active === false).map(([key, label]) => (
              <button key={key} className="link" style={{ fontSize: '12px', padding: '2px 6px' }} onClick={() => onUpdateTariff(key, { ...activeTariff[key], active: true })}>+ {label}</button>
            ))}
          </div>
        )}
        <div className="tariffHistory">
          <b>Historia zmian</b>
          {[...tariffs].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom)).map(t => (
            <div key={t.effectiveFrom} className="tariffRow">
              <div>
                <span>Od {t.effectiveFrom}</span>
                <small>{money(t.values.coldWater)}/m³ woda · {money(t.values.sewage)}/m³ ścieki</small>
              </div>
              {tariffs.length > 1 && (
                <button className="removeBtn" onClick={() => onDeleteTariff(t.effectiveFrom)} title="Usuń taryfikator">
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
