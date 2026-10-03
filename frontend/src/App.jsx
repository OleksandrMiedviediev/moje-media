import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Home, Settings, WalletCards, X } from 'lucide-react';
import { API, DEFAULT_SETTINGS, DEFAULT_TARIFFS } from './constants';
import { apiDelete, apiGet, apiPut } from './api';
import { monthNow, num } from './utils';
import { AuthScreen, OnboardingScreen } from './components/Auth';
import { HomeTab, entryPayload } from './components/HomeTab';
import { HistoryTab } from './components/HistoryTab';
import { SettingsTab } from './components/SettingsTab';

export default function App() {
  const [auth, setAuth] = useState(() => {
    const t = localStorage.getItem('mb-token');
    return t ? { token: t, onboarded: true } : null;
  });
  const [settings, setSettings] = useState(() => JSON.parse(localStorage.getItem('mb-settings') || 'null') || DEFAULT_SETTINGS);
  const [tariffs, setTariffs] = useState(() => JSON.parse(localStorage.getItem('mb-tariffs') || 'null') || [{ effectiveFrom: '2026-01', values: DEFAULT_TARIFFS }]);
  const [entries, setEntries] = useState(() => JSON.parse(localStorage.getItem('mb-entries') || '[]'));
  const [month, setMonth] = useState(monthNow());
  const [water, setWater] = useState('');
  const [editing, setEditing] = useState(null);
  const [tab, setTab] = useState('home');
  const [tariffMonth, setTariffMonth] = useState(monthNow());
  const [status, setStatus] = useState('');

  const sortedEntries = useMemo(() => [...entries].sort((a, b) => b.month.localeCompare(a.month)), [entries]);
  const previousEntry = entries.filter(e => e.month < month).sort((a, b) => b.month.localeCompare(a.month))[0];
  const previousWater = editing?.previousWater ?? previousEntry?.currentWater ?? 0;
  const selectedTariff = useMemo(
    () => tariffs.filter(t => t.effectiveFrom <= month).sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0]?.values || DEFAULT_TARIFFS,
    [tariffs, month]
  );
  const tariffMonthValues = useMemo(
    () => tariffs.filter(t => t.effectiveFrom <= tariffMonth).sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0]?.values || DEFAULT_TARIFFS,
    [tariffs, tariffMonth]
  );
  const activeTariff = tariffs.find(t => t.effectiveFrom === tariffMonth)?.values || tariffMonthValues;

  useEffect(() => localStorage.setItem('mb-settings', JSON.stringify(settings)), [settings]);
  useEffect(() => localStorage.setItem('mb-tariffs', JSON.stringify(tariffs)), [tariffs]);
  useEffect(() => localStorage.setItem('mb-entries', JSON.stringify(entries)), [entries]);

  useEffect(() => {
    if (!API || !auth) return;
    (async () => {
      try {
        const [s, t, e] = await Promise.all([apiGet('/api/settings'), apiGet('/api/tariffs'), apiGet('/api/entries')]);
        setSettings(s); setTariffs(t); setEntries(e);
      } catch { setStatus('Tryb lokalny — API nie jest dostępne.'); }
    })();
  }, [auth]);

  const logout = () => { localStorage.removeItem('mb-token'); setAuth(null); };

  const saveEntry = async result => {
    if (!water) { setStatus('Wpisz aktualne wskazanie wody.'); return; }
    const payload = entryPayload(month, previousWater, water, result, selectedTariff);
    setEntries([...entries.filter(e => e.month !== month), payload]);
    setEditing(null); setWater('');
    if (API) {
      try { await apiPut(`/api/entries/${month}`, payload); setStatus('Zapisano miesiąc.'); }
      catch { setStatus('Zapisano lokalnie. API chwilowo niedostępne.'); }
    } else setStatus('Zapisano miesiąc.');
  };

  const editEntry = e => {
    setMonth(e.month); setWater(String(e.currentWater)); setEditing(e); setTab('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const removeEntry = async e => {
    if (!confirm(`Usunąć ${e.month}?`)) return;
    setEntries(entries.filter(x => x.month !== e.month));
    if (API) try { await apiDelete(`/api/entries/${e.month}`); } catch { /* ignore */ }
  };

  const saveTariff = async () => {
    const values = { ...activeTariff };
    setTariffs([...tariffs.filter(t => t.effectiveFrom !== tariffMonth), { effectiveFrom: tariffMonth, values }]
      .sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom)));
    if (API) try { await apiPut('/api/tariffs', { effectiveFrom: tariffMonth, values }); } catch { /* ignore */ }
    setStatus(`Nowy taryfikator od ${tariffMonth}. Wcześniejsze miesiące bez zmian.`);
  };

  const updateTariff = (key, value) => setTariffs(ts => ts.some(t => t.effectiveFrom === tariffMonth)
    ? ts.map(t => t.effectiveFrom === tariffMonth ? { ...t, values: { ...t.values, [key]: num(value) } } : t)
    : [...ts, { effectiveFrom: tariffMonth, values: { ...tariffMonthValues, [key]: num(value) } }]
      .sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom)));

  const saveSettings = async () => {
    if (API) {
      try { await apiPut('/api/settings', settings); setStatus('Ustawienia zapisane na serwerze.'); }
      catch { setStatus('Zapisano lokalnie.'); }
    }
  };

  if (!auth) return <AuthScreen onAuth={setAuth} />;
  if (!auth.onboarded) {
    return <OnboardingScreen onDone={data => { setAuth({ ...auth, onboarded: true }); setSettings(s => ({ ...s, ...data })); }} />;
  }

  return (
    <div className="app">
      <header className="top">
        <div>
          <div className="eyebrow">DOMOWE MEDIA</div>
          <h1>Moje Media</h1>
          <div className="sub"><Home size={15} />{settings.apartment}</div>
        </div>
        <div className="area">{num(settings.area).toFixed(2).replace('.', ',')} m²</div>
      </header>

      <nav className="tabs">
        <button className={tab === 'home' ? 'active' : ''} onClick={() => setTab('home')}><WalletCards />Bieżące</button>
        <button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}><BarChart3 />Historia</button>
        <button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}><Settings />Ustawienia</button>
      </nav>

      {status && <div className="toast" onClick={() => setStatus('')}>{status}<X size={15} /></div>}

      <main>
        {tab === 'home' && (
          <HomeTab
            month={month} setMonth={setMonth}
            water={water} setWater={setWater}
            editing={editing} setEditing={setEditing}
            previousWater={previousWater}
            settings={settings}
            selectedTariff={selectedTariff}
            onSave={saveEntry}
          />
        )}
        {tab === 'history' && (
          <HistoryTab
            entries={entries}
            sortedEntries={sortedEntries}
            settings={settings}
            onEdit={editEntry}
            onRemove={removeEntry}
          />
        )}
        {tab === 'settings' && (
          <SettingsTab
            settings={settings} setSettings={setSettings}
            tariffs={tariffs}
            tariffMonth={tariffMonth} setTariffMonth={setTariffMonth}
            activeTariff={activeTariff}
            onSaveSettings={saveSettings}
            onSaveTariff={saveTariff}
            onUpdateTariff={updateTariff}
            onLogout={logout}
          />
        )}
      </main>
    </div>
  );
}
