import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../api';
import { money } from '../utils';

export function FinancePanel({ apartmentId, entries, isOwner }) {
  const [summary, setSummary] = useState(null);
  const [payments, setPayments] = useState([]);
  const [audit, setAudit] = useState([]);
  const [month, setMonth] = useState('');
  const [amount, setAmount] = useState('');
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState('bank_transfer');
  const [reference, setReference] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    if (!apartmentId) return;
    const [s, p, a] = await Promise.all([
      apiGet('/api/finance/summary?apartmentId=' + encodeURIComponent(apartmentId)),
      apiGet('/api/apartments/' + encodeURIComponent(apartmentId) + '/payments'),
      apiGet('/api/apartments/' + encodeURIComponent(apartmentId) + '/audit-log')
    ]);
    setSummary(s); setPayments(p); setAudit(a);
    if (!month && entries?.length) setMonth(entries[0].month);
  };
  useEffect(() => { refresh().catch(() => setMessage('Nie udało się pobrać danych finansowych.')); }, [apartmentId]);

  const submit = async e => {
    e.preventDefault(); setMessage(''); setBusy(true);
    try {
      await apiPost('/api/apartments/' + encodeURIComponent(apartmentId) + '/payments', {
        month, amount: Number(String(amount).replace(',', '.')), paidAt, method, reference, proofUrl, note
      });
      setAmount(''); setReference(''); setProofUrl(''); setNote('');
      setMessage('Płatność zapisana.'); await refresh();
    } catch (err) { setMessage(err.response?.data?.error || 'Nie udało się zapisać płatności.'); }
    finally { setBusy(false); }
  };

  return <section className="card">
    <h2>Finanse mieszkania</h2>
    {summary && <div className="stats">
      <div><span>Naliczone</span><b>{money(summary.billed)}</b></div>
      <div><span>Otrzymano</span><b>{money(summary.paid)}</b></div>
      <div><span>Pozostało</span><b>{money(summary.remaining)}</b></div>
    </div>}
    {summary?.months?.length > 0 && <div className="financeChart" style={{display:'flex',alignItems:'end',gap:8,height:140,overflowX:'auto',padding:'12px 0'}}>
      {summary.months.map(m => <div key={m.month} title={m.month + ': naliczone ' + m.billed.toFixed(2) + ' zł, opłacone ' + m.paid.toFixed(2) + ' zł'} style={{minWidth:30,flex:'1 0 30px',height:'100%',display:'flex',flexDirection:'column',justifyContent:'end',alignItems:'center',gap:3}}>
        <div style={{width:'100%',height:(Math.max(0,m.billed)/Math.max(1,...summary.months.map(x=>x.billed))*100)+'%',background:'#a5b8d4',position:'relative',minHeight:m.billed?4:0}}>
          <div style={{position:'absolute',bottom:0,left:0,right:0,height:(m.billed?Math.min(100,m.paid/m.billed*100):0)+'%',background:'#16a34a'}} />
        </div><small>{m.month.slice(5)}</small>
      </div>)}
    </div>}
    <p className="authSub">Wykres: szary — naliczone, zielony — opłacone.</p>
    {isOwner && <form className="grid" onSubmit={submit}>
      <h3>Dodaj płatność</h3>
      <label>Miesiąc rozliczenia<input type="month" required value={month} onChange={e=>setMonth(e.target.value)} /></label>
      <label>Kwota (zł)<input type="number" min="0.01" step="0.01" required value={amount} onChange={e=>setAmount(e.target.value)} /></label>
      <label>Data płatności<input type="date" required value={paidAt} onChange={e=>setPaidAt(e.target.value)} /></label>
      <label>Sposób płatności<select value={method} onChange={e=>setMethod(e.target.value)}><option value="bank_transfer">Przelew</option><option value="cash">Gotówka</option><option value="other">Inny</option></select></label>
      <label>Numer referencyjny<input maxLength="160" value={reference} onChange={e=>setReference(e.target.value)} /></label>
      <label>Link do potwierdzenia (HTTPS)<input type="url" placeholder="https://…" value={proofUrl} onChange={e=>setProofUrl(e.target.value)} /></label>
      <label>Notatka<input maxLength="500" value={note} onChange={e=>setNote(e.target.value)} /></label>
      <button className="primary" type="submit" disabled={busy}>{busy ? 'Zapisywanie…' : 'Zapisz płatność'}</button>
    </form>}
    {message && <p role="status">{message}</p>}
    <h3>Historia płatności</h3>
    {payments.length ? payments.map(p=><div className="aptRow" key={p._id}><div><b>{money(p.amount)} · {p.month}</b><small>{new Date(p.paidAt).toLocaleDateString('pl-PL')} · {p.method==='cash'?'Gotówka':p.method==='bank_transfer'?'Przelew':'Inny'} {p.reference && '· '+p.reference}</small>{p.note && <small>{p.note}</small>}{p.proofUrl && <a href={p.proofUrl} target="_blank" rel="noreferrer">Potwierdzenie płatności</a>}</div></div>) : <p className="authSub">Brak zarejestrowanych płatności.</p>}
    <h3>Dziennik zmian</h3>
    {audit.length ? audit.map(log=><div className="aptRow" key={log._id}><div><b>{log.action}</b><small>{log.actorEmail} · {new Date(log.createdAt).toLocaleString('pl-PL')} {log.month && '· '+log.month}</small><small>{log.oldValue ? 'Przed: '+JSON.stringify(log.oldValue) : 'Przed: —'}</small><small>Po: {JSON.stringify(log.newValue)}</small></div></div>) : <p className="authSub">Brak zmian w dzienniku.</p>}
  </section>;
}
