import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Home, Moon, Settings, Sun, WalletCards, X } from 'lucide-react';
import { API, DEFAULT_SETTINGS, DEFAULT_TARIFFS } from './constants';
import { apiDelete, apiGet, apiPost, apiPut } from './api';
import { monthNow, num } from './utils';
import { AuthScreen, OnboardingScreen } from './components/Auth';
import { HomeTab, entryPayload } from './components/HomeTab';
import { HistoryTab } from './components/HistoryTab';
import { SettingsTab } from './components/SettingsTab';

// Миграция: старые settings → apartments[]
const migrateSettings = s => {
  if (s.apartments) return { ...s, notifications: s.notifications || [] };
  const apt = {
    id: 'a1',
    name: s.apartment || 'Mieszkanie',
    area: s.area || 0,
    residents: s.residents || 1,
    waterGoalPerPerson: s.waterGoalPerPerson || 3,
    customItems: s.customItems || [],
    payeeName: s.payeeName || '',
    payeeIban: s.payeeIban || '',
    paymentNote: s.paymentNote || '',
    payeeNip: s.payeeNip || '',
    tariffs: s.tariffs || null
  };
  return { apartments: [apt], activeApartmentId: 'a1', notifications: s.notifications || [] };
};

export default function App() {
  const [auth, setAuth] = useState(() => {
    const t = localStorage.getItem('mb-token');
    return t ? { token: t, onboarded: true } : null;
  });
  const [settings, setSettings] = useState(() => migrateSettings(JSON.parse(localStorage.getItem('mb-settings') || 'null') || DEFAULT_SETTINGS));
  const [entries, setEntries] = useState(() => JSON.parse(localStorage.getItem('mb-entries') || '[]'));
  const [month, setMonth] = useState(monthNow());
  const [water, setWater] = useState('');
  const [customReadings, setCustomReadings] = useState({});
  const [editing, setEditing] = useState(null);
  const [tab, setTab] = useState(() => localStorage.getItem('mb-tab') || 'home');
  const [tariffMonth, setTariffMonth] = useState(monthNow());
  const [status, setStatus] = useState('');
  const [dark, setDark] = useState(() => localStorage.getItem('mb-theme') === 'dark');

  useEffect(() => {
    localStorage.setItem('mb-theme', dark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  useEffect(() => localStorage.setItem('mb-tab', tab), [tab]);

  const activeApartment = settings.apartments?.find(a => a.id === settings.activeApartmentId) || settings.apartments?.[0];
  const tariffs = activeApartment?.tariffs || [{ effectiveFrom: '2026-01', values: DEFAULT_TARIFFS }];

  const sortedEntries = useMemo(() => entries.filter(e => e.apartmentId === settings.activeApartmentId).sort((a, b) => b.month.localeCompare(a.month)), [entries, settings.activeApartmentId]);
  const previousEntry = sortedEntries.filter(e => e.month < month).sort((a, b) => b.month.localeCompare(a.month))[0];
  const previousWater = editing?.previousWater ?? previousEntry?.currentWater ?? 0;
  const selectedTariff = useMemo(
    () => tariffs.filter(t => t.effectiveFrom <= month).sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0]?.values || DEFAULT_TARIFFS,
    [tariffs, month]
  );
  const activeTariff = tariffs.find(t => t.effectiveFrom === month)?.values || selectedTariff;

  useEffect(() => localStorage.setItem('mb-settings', JSON.stringify(settings)), [settings]);
  useEffect(() => localStorage.setItem('mb-entries', JSON.stringify(entries)), [entries]);

  useEffect(() => {
    if (!API || !auth) return;
    (async () => {
      try {
        const [s, e] = await Promise.all([apiGet('/api/settings'), apiGet('/api/entries')]);
        setSettings(migrateSettings(s));
        setEntries(e);
      } catch { setStatus('Tryb lokalny — API nie jest dostępne.'); }
    })();
  }, [auth]);

  // Подписка на push при первой загрузке (если разрешено)
  useEffect(() => {
    if (!API || !auth || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (Notification.permission !== 'granted') return;
    (async () => {
      try {
        await navigator.serviceWorker.register('/sw.js');
        const reg = await Promise.race([
          navigator.serviceWorker.ready,
          new Promise((_, rej) => setTimeout(() => rej(new Error('SW timeout')), 5000))
        ]);
        const { key } = await apiGet('/api/push/vapid-key');
        if (!key) return;
        const sub = await reg.pushManager.getSubscription();
        if (!sub) {
          const newSub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) });
          await apiPost('/api/push/subscribe', newSub.toJSON());
          console.log('[PUSH] Subscribed');
        } else {
          console.log('[PUSH] Already subscribed');
        }
      } catch (e) { console.error('[PUSH] Error:', e.message); }
    })();
  }, [auth]);

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
  }

  const logout = () => { localStorage.removeItem('mb-token'); setAuth(null); };

  const switchApartment = id => {
    setSettings({ ...settings, activeApartmentId: id });
    setWater(''); setCustomReadings({}); setEditing(null);
  };

  const addApartment = async data => {
    const id = `a${Date.now()}`;
    const apt = { id, ...data, customItems: [], tariffs: [{ effectiveFrom: '2026-01', values: DEFAULT_TARIFFS }] };
    const next = { ...settings, apartments: [...settings.apartments, apt], activeApartmentId: id };
    setSettings(next);
    if (API) try { await apiPut('/api/settings', next); } catch { /* ignore */ }
    return id;
  };

  const removeApartment = async id => {
    const apt = settings.apartments.find(a => a.id === id);
    if (!confirm(`Usunąć „${apt?.name}” wraz z całą historią?`)) return;
    const nextApts = settings.apartments.filter(a => a.id !== id);
    if (!nextApts.length) return;
    const next = { ...settings, apartments: nextApts, activeApartmentId: nextApts[0].id };
    setSettings(next);
    setEntries(entries.filter(e => e.apartmentId !== id));
    if (API) try { await apiPut('/api/settings', next); } catch { /* ignore */ }
  };

  const saveEntry = async result => {
    if (!water) { setStatus('Wpisz aktualne wskazanie wody.'); return; }
    const payload = entryPayload(month, previousWater, water, result, selectedTariff, customReadings);
    payload.custom = result.custom;
    payload.customReadings = customReadings;
    payload.apartmentId = settings.activeApartmentId;
    setEntries([...entries.filter(e => !(e.month === month && e.apartmentId === settings.activeApartmentId)), payload]);
    // Обновить lastValue счётчиков активного адреса для следующего месяца
    const updatedApts = settings.apartments.map(a =>
      a.id === settings.activeApartmentId
        ? { ...a, customItems: (a.customItems || []).map(item =>
            item.type === 'meter' && customReadings[item.id] !== undefined
              ? { ...item, lastValue: num(customReadings[item.id]) }
              : item
          ) }
        : a
    );
    setSettings({ ...settings, apartments: updatedApts });
    setEditing(null); setWater(''); setCustomReadings({});
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
    const updatedApts = settings.apartments.map(a =>
      a.id === settings.activeApartmentId
        ? { ...a, tariffs: [...(a.tariffs || []).filter(t => t.effectiveFrom !== tariffMonth), { effectiveFrom: tariffMonth, values }].sort((x, y) => x.effectiveFrom.localeCompare(y.effectiveFrom)) }
        : a
    );
    setSettings({ ...settings, apartments: updatedApts });
    if (API) try { await apiPut('/api/settings', { ...settings, apartments: updatedApts }); } catch { /* ignore */ }
    setStatus(`Nowy taryfikator od ${tariffMonth}. Wcześniejsze miesiące bez zmian.`);
  };

  const updateTariff = (key, value) => {
    const tariffMonthValues = tariffs.filter(t => t.effectiveFrom <= tariffMonth).sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0]?.values || DEFAULT_TARIFFS;
    // value может быть числом (простое обновление) или объектом {value, active}
    const patch = typeof value === 'object' ? value : { value: num(value) };
    const updatedApts = settings.apartments.map(a =>
      a.id === settings.activeApartmentId
        ? { ...a, tariffs: (a.tariffs || []).some(t => t.effectiveFrom === tariffMonth)
            ? a.tariffs.map(t => t.effectiveFrom === tariffMonth ? { ...t, values: { ...t.values, [key]: patch } } : t)
            : [...(a.tariffs || []), { effectiveFrom: tariffMonth, values: { ...tariffMonthValues, [key]: patch } }].sort((x, y) => x.effectiveFrom.localeCompare(y.effectiveFrom))
          }
        : a
    );
    setSettings({ ...settings, apartments: updatedApts });
  };

  const saveSettings = async (override) => {
    const toSave = override || settings;
    if (API) {
      try { await apiPut('/api/settings', toSave); setStatus('Ustawienia zapisane na serwerze.'); }
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
          {settings.apartments.length > 1 ? (
            <select className="aptSelect" value={settings.activeApartmentId} onChange={e => switchApartment(e.target.value)}>
              {settings.apartments.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          ) : (
            <div className="sub"><Home size={15} />{activeApartment?.name}</div>
          )}
        </div>
        <div className="area">{num(activeApartment?.area).toFixed(2).replace('.', ',')} m²</div>
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
            settings={activeApartment}
            selectedTariff={selectedTariff}
            onSave={saveEntry}
            savedEntry={entries.find(e => e.month === month && e.apartmentId === settings.activeApartmentId)}
            customReadings={customReadings}
            setCustomReadings={setCustomReadings}
          />
        )}
        {tab === 'history' && (
          <HistoryTab
            entries={sortedEntries}
            sortedEntries={sortedEntries}
            settings={activeApartment}
            onEdit={editEntry}
            onRemove={removeEntry}
          />
        )}
        {tab === 'settings' && (
          <SettingsTab
            settings={activeApartment} setSettings={patch => setSettings({ ...settings, apartments: settings.apartments.map(a => a.id === settings.activeApartmentId ? { ...a, ...patch } : a) })}
            allSettings={settings}
            apartments={settings.apartments}
            activeApartmentId={settings.activeApartmentId}
            onAddApartment={addApartment}
            onRemoveApartment={removeApartment}
            tariffs={tariffs}
            tariffMonth={tariffMonth} setTariffMonth={setTariffMonth}
            activeTariff={activeTariff}
            onSaveSettings={saveSettings}
            onSaveTariff={saveTariff}
            onUpdateTariff={updateTariff}
            onLogout={logout}
            dark={dark} setDark={setDark}
          />
        )}
      </main>
    </div>
  );
}
