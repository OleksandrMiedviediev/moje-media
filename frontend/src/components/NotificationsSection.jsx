import { useState } from 'react';
import { Bell, Plus, Trash2 } from 'lucide-react';
import { Field } from './common';

const NOTIF_TYPES = [
  { id: 'reading', name: 'Wpisz wskazania' },
  { id: 'payment', name: 'Do zapłaty' }
];

export function NotificationsSection({ settings, setSettings, onSaveSettings }) {
  const notifs = settings.notifications || [];
  const [newType, setNewType] = useState('reading');
  const [newDay, setNewDay] = useState('25');
  const [newTime, setNewTime] = useState('18:00');

  const addNotif = () => {
    const id = `n${Date.now()}`;
    setSettings({ notifications: [...(settings.notifications || []), { id, type: newType, day: Number(newDay), time: newTime, active: true }] });
  };

  const updateNotif = (id, patch) => {
    setSettings({ notifications: (settings.notifications || []).map(n => n.id === id ? { ...n, ...patch } : n) });
  };

  const removeNotif = async id => {
    if (!confirm('Usunąć przypomnienie?')) return;
    const next = (settings.notifications || []).filter(n => n.id !== id);
    setSettings({ notifications: next });
    try { await onSaveSettings({ ...settings, notifications: next }); } catch { /* ignore */ }
  };

  const requestPermission = async () => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') return;
    if (Notification.permission === 'denied') {
      alert('Powiadomienia zablokowane. Włącz w ustawieniach przeglądarki.');
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') alert('Brak zgody na powiadomienia.');
  };

  return (
    <section className="card">
      <h2><Bell />Powiadomienia</h2>
      <p>Przypomnienia o wpisaniu wskazań lub płatności — push na telefon.</p>
      <button className="secondary" onClick={requestPermission} style={{ marginBottom: '12px' }}>
        <Bell size={16} /> Włącz powiadomienia push
      </button>

      {notifs.length === 0 && <p className="authSub" style={{ margin: '8px 0' }}>Brak przypomnień. Dodaj pierwsze.</p>}
      {notifs.map(n => (
        <div className="customItem" key={n.id}>
          <div className="customHead">
            <span className={`badge ${n.type}`}>{NOTIF_TYPES.find(t => t.id === n.type)?.name || n.type}</span>
            <button className="removeBtn" onClick={() => removeNotif(n.id)}><Trash2 size={14} />Usuń</button>
          </div>
          <div className="grid">
            <label>Dzień miesiąca
              <input type="number" min="1" max="31" value={n.day} onChange={e => updateNotif(n.id, { day: Number(e.target.value) })} />
            </label>
            <label>Godzina
              <input type="time" value={n.time} onChange={e => updateNotif(n.id, { time: e.target.value })} />
            </label>
          </div>
          <label className="checkRow" style={{ marginTop: '10px' }}>
            <input type="checkbox" checked={n.active} onChange={e => updateNotif(n.id, { active: e.target.checked })} />
            <span>Aktywne</span>
          </label>
        </div>
      ))}

      <div className="customItem" style={{ borderStyle: 'dashed', background: 'transparent' }}>
        <div className="grid">
          <label>Typ
            <select value={newType} onChange={e => setNewType(e.target.value)}>
              {NOTIF_TYPES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
          <Field label="Dzień miesiąca" value={newDay} type="number" onChange={setNewDay} />
          <Field label="Godzina" value={newTime} type="time" onChange={setNewTime} />
        </div>
        <button className="secondary" onClick={addNotif} style={{ marginTop: '10px' }}><Plus size={15} /> Dodaj przypomnienie</button>
      </div>
      <button className="secondary" onClick={onSaveSettings}>Zapisz dane</button>
    </section>
  );
}
