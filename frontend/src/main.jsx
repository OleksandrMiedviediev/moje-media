import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import axios from 'axios';
import { BarChart3, ChevronDown, ChevronUp, Droplets, Eye, EyeOff, Home, LogOut, Pencil, Plus, Settings, Trash2, WalletCards, X } from 'lucide-react';
import './styles.css';

const API = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '';
axios.interceptors.request.use(cfg=>{const t=localStorage.getItem('mb-token');if(t)cfg.headers.Authorization=`Bearer ${t}`;return cfg;});
const DEFAULT_SETTINGS = { apartment:'Słoneczna 12 / 4', area:59.51, residents:3 };
const DEFAULT_TARIFFS = { coldWater:8.47, sewage:12.39, wastePerPerson:40, maintenancePerM2:1.10, administrationPerM2:1.03, cleaning:26, stairLightPerPerson:2.40, renovationPerM2:1.50 };
const LABELS = { coldWater:'Zimna woda', sewage:'Ścieki', wastePerPerson:'Śmieci', maintenancePerM2:'Konserwacja', administrationPerM2:'Administracja', cleaning:'Sprzątanie klatek', stairLightPerPerson:'Światło klatki', renovationPerM2:'Fundusz remontowy' };
const money = n => `${Number(n||0).toFixed(2).replace('.',',')} zł`;
const num = v => Number(String(v ?? '').replace(',','.')) || 0;
const monthNow = () => new Date().toISOString().slice(0,7);
const monthLabel = m => new Intl.DateTimeFormat('pl-PL',{month:'long',year:'numeric'}).format(new Date(`${m}-01T00:00:00`));
const calc = (water, prev, settings, tariffs) => {
  const usage = Math.max(0, num(water)-num(prev));
  const variable = usage*(num(tariffs.coldWater)+num(tariffs.sewage));
  const fixed = num(tariffs.wastePerPerson)*num(settings.residents)+num(tariffs.maintenancePerM2)*num(settings.area)+num(tariffs.administrationPerM2)*num(settings.area)+num(tariffs.cleaning)+num(tariffs.stairLightPerPerson)*num(settings.residents)+num(tariffs.renovationPerM2)*num(settings.area);
  const breakdown = { water:usage*num(tariffs.coldWater), sewage:usage*num(tariffs.sewage), waste:num(tariffs.wastePerPerson)*num(settings.residents), maintenance:num(tariffs.maintenancePerM2)*num(settings.area), administration:num(tariffs.administrationPerM2)*num(settings.area), cleaning:num(tariffs.cleaning), light:num(tariffs.stairLightPerPerson)*num(settings.residents), renovation:num(tariffs.renovationPerM2)*num(settings.area) };
  return {usage,variable,fixed,total:variable+fixed,breakdown};
};

async function apiGet(path){ return (await axios.get(`${API}${path}`)).data; }
async function apiPut(path,data){ return (await axios.put(`${API}${path}`,data)).data; }
async function apiDelete(path){ return axios.delete(`${API}${path}`); }

function App(){
  const [auth,setAuth]=useState(()=>{const t=localStorage.getItem('mb-token');return t?{token:t,onboarded:true}:null;});
  const [settings,setSettings]=useState(()=>JSON.parse(localStorage.getItem('mb-settings')||'null')||DEFAULT_SETTINGS);
  const [tariffs,setTariffs]=useState(()=>JSON.parse(localStorage.getItem('mb-tariffs')||'null')||[{effectiveFrom:'2026-01',values:DEFAULT_TARIFFS}]);
  const [entries,setEntries]=useState(()=>JSON.parse(localStorage.getItem('mb-entries')||'[]'));
  const [month,setMonth]=useState(monthNow());
  const [water,setWater]=useState('');
  const [editing,setEditing]=useState(null);
  const [tab,setTab]=useState('home');
  const [tariffMonth,setTariffMonth]=useState(monthNow());
  const [status,setStatus]=useState('');
  const [expanded,setExpanded]=useState(null);

  const logout=()=>{localStorage.removeItem('mb-token');setAuth(null);};

  const sortedEntries=useMemo(()=>[...entries].sort((a,b)=>b.month.localeCompare(a.month)),[entries]);
  const previousEntry=entries.filter(e=>e.month<month).sort((a,b)=>b.month.localeCompare(a.month))[0];
  const previousWater=editing?.previousWater ?? previousEntry?.currentWater ?? 0;
  const selectedTariff=useMemo(()=>tariffs.filter(t=>t.effectiveFrom<=month).sort((a,b)=>b.effectiveFrom.localeCompare(a.effectiveFrom))[0]?.values || DEFAULT_TARIFFS,[tariffs,month]);
  const tariffMonthValues=useMemo(()=>tariffs.filter(t=>t.effectiveFrom<=tariffMonth).sort((a,b)=>b.effectiveFrom.localeCompare(a.effectiveFrom))[0]?.values || DEFAULT_TARIFFS,[tariffs,tariffMonth]);
  const result=useMemo(()=>calc(water,previousWater,settings,selectedTariff),[water,previousWater,settings,selectedTariff]);

  useEffect(()=>localStorage.setItem('mb-settings',JSON.stringify(settings)),[settings]);
  useEffect(()=>localStorage.setItem('mb-tariffs',JSON.stringify(tariffs)),[tariffs]);
  useEffect(()=>localStorage.setItem('mb-entries',JSON.stringify(entries)),[entries]);
  useEffect(()=>{
    if(!API||!auth) return;
    (async()=>{try{const [s,t,e]=await Promise.all([apiGet('/api/settings'),apiGet('/api/tariffs'),apiGet('/api/entries')]); setSettings(s); setTariffs(t); setEntries(e);}catch{setStatus('Tryb lokalny — API nie jest dostępne.');}})();
  },[auth]);

  if(!auth) return <AuthScreen onAuth={setAuth}/>;
  if(!auth.onboarded) return <OnboardingScreen onDone={data=>{setAuth({...auth,onboarded:true});setSettings(s=>({...s,...data}));}}/>;

  const saveEntry=async()=>{
    if(!water){setStatus('Wpisz aktualne wskazanie wody.');return;}
    const payload={month,previousWater:num(previousWater),currentWater:num(water),usage:result.usage,total:result.total,breakdown:result.breakdown,tariffs:selectedTariff};
    const next=[...entries.filter(e=>e.month!==month),payload]; setEntries(next); setEditing(null); setWater('');
    if(API) try{await apiPut(`/api/entries/${month}`,payload); setStatus('Zapisano miesiąc.');}catch{setStatus('Zapisano lokalnie. API chwilowo niedostępne.');} else setStatus('Zapisano miesiąc.');
  };
  const editEntry=e=>{setMonth(e.month);setWater(String(e.currentWater));setEditing(e);setTab('home');window.scrollTo({top:0,behavior:'smooth'});};
  const removeEntry=async e=>{if(!confirm(`Usunąć ${monthLabel(e.month)}?`))return;setEntries(entries.filter(x=>x.month!==e.month));if(API)try{await apiDelete(`/api/entries/${e.month}`)}catch{} };
  const saveTariff=async()=>{const values={...activeTariff};const next=[...tariffs.filter(t=>t.effectiveFrom!==tariffMonth),{effectiveFrom:tariffMonth,values}].sort((a,b)=>a.effectiveFrom.localeCompare(b.effectiveFrom));setTariffs(next);if(API)try{await apiPut('/api/tariffs',{effectiveFrom:tariffMonth,values})}catch{};setStatus(`Nowy taryfikator od ${tariffMonth}. Wcześniejsze miesiące bez zmian.`);};
  const updateTariff=(key,value)=>setTariffs(ts=>ts.some(t=>t.effectiveFrom===tariffMonth)
    ?ts.map(t=>t.effectiveFrom===tariffMonth?{...t,values:{...t.values,[key]:num(value)}}:t)
    :[...ts,{effectiveFrom:tariffMonth,values:{...tariffMonthValues,[key]:num(value)}}].sort((a,b)=>a.effectiveFrom.localeCompare(b.effectiveFrom)));
  const activeTariff=tariffs.find(t=>t.effectiveFrom===tariffMonth)?.values || tariffMonthValues;
  const annual=sortedEntries.reduce((s,e)=>s+num(e.total),0);
  const avg=sortedEntries.length?annual/sortedEntries.length:0;
  const maxUsage=Math.max(1,...sortedEntries.map(e=>num(e.usage)));

  return <div className="app">
    <header className="top"><div><div className="eyebrow">DOMOWE MEDIA</div><h1>Moje Media</h1><div className="sub"><Home size={15}/>{settings.apartment}</div></div><div className="area">{num(settings.area).toFixed(2).replace('.',',')} m²</div></header>
    <nav className="tabs"><button className={tab==='home'?'active':''} onClick={()=>setTab('home')}><WalletCards/>Bieżące</button><button className={tab==='history'?'active':''} onClick={()=>setTab('history')}><BarChart3/>Historia</button><button className={tab==='settings'?'active':''} onClick={()=>setTab('settings')}><Settings/>Ustawienia</button></nav>
    {status&&<div className="toast" onClick={()=>setStatus('')}>{status}<X size={15}/></div>}
    <main>
      {tab==='home'&&<>
        <section className="hero card"><div><span>DO ZAPŁATY</span><strong>{money(result.total)}</strong><small>{monthLabel(month)}</small></div><div className="heroIcon"><WalletCards size={28}/></div></section>
        <section className="card"><div className="cardHead"><div><h2><Droplets/>Woda</h2><p>Podaj tylko aktualne wskazanie.</p></div><input className="month" type="month" value={month} onChange={e=>{setMonth(e.target.value);setEditing(null);setWater('')}}/></div><div className="waterGrid"><label>Poprzednie wskazanie<input value={String(previousWater).replace('.',',')} readOnly/></label><label>Aktualne wskazanie<input autoFocus inputMode="decimal" value={water} onChange={e=>setWater(e.target.value)} placeholder="np. 128,7"/></label></div><div className="usage"><div><span>Zużycie</span><b>{result.usage.toFixed(2).replace('.',',')} m³</b></div><div><span>Woda + ścieki</span><b>{money(result.variable)}</b></div></div>{editing&&<div className="editNotice">Edytujesz {monthLabel(month)}. Po zapisaniu stare wyliczenie zostanie zastąpione.</div>}</section>
        <section className="card"><h2>Rozliczenie</h2><div className="rows"><Row name="Zimna woda" value={result.breakdown.water}/><Row name="Ścieki" value={result.breakdown.sewage}/><div className="separator"/><Row name="Śmieci" value={result.breakdown.waste}/><Row name="Konserwacja" value={result.breakdown.maintenance}/><Row name="Administracja" value={result.breakdown.administration}/><Row name="Sprzątanie klatek" value={result.breakdown.cleaning}/><Row name="Światło klatki" value={result.breakdown.light}/><Row name="Fundusz remontowy" value={result.breakdown.renovation}/></div><div className="grand"><span>RAZEM</span><b>{money(result.total)}</b></div></section>
        <button className="primary" onClick={saveEntry}>{editing?'Zapisz zmiany':'Zapisz miesiąc'}</button>
      </>}
      {tab==='history'&&<>
        <section className="card stats"><div><span>Łącznie</span><b>{money(annual)}</b></div><div><span>Średnio / miesiąc</span><b>{money(avg)}</b></div><div><span>Miesięcy</span><b>{entries.length}</b></div></section>
        <section className="card"><div className="cardHead"><div><h2><BarChart3/>Zużycie wody</h2><p>Ostatnie zapisane miesiące</p></div></div><div className="chart">{sortedEntries.slice(0,12).reverse().map(e=><div className="barWrap" key={e.month}><div className="bar" style={{height:`${Math.max(8,num(e.usage)/maxUsage*150)}px`}}><span>{num(e.usage).toFixed(1)}</span></div><small>{e.month.slice(5)}</small></div>)}</div></section>
        <section className="card"><h2>Historia rozliczeń</h2>{sortedEntries.length===0?<Empty/>:<div className="history">{sortedEntries.map(e=><div className="historyItem" key={e.month}><button className="historyMain" onClick={()=>setExpanded(expanded===e.month?null:e.month)}><div><b>{monthLabel(e.month)}</b><small>{num(e.usage).toFixed(2).replace('.',',')} m³ wody</small></div><strong>{money(e.total)}</strong>{expanded===e.month?<ChevronUp/>:<ChevronDown/>}</button>{expanded===e.month&&<div className="historyDetails"><Row name="Woda" value={e.breakdown?.water}/><Row name="Ścieki" value={e.breakdown?.sewage}/><Row name="Pozostałe" value={num(e.total)-num(e.breakdown?.water)-num(e.breakdown?.sewage)}/><div className="actions"><button onClick={()=>editEntry(e)}><Pencil size={16}/>Edytuj</button><button className="danger" onClick={()=>removeEntry(e)}><Trash2 size={16}/>Usuń</button></div></div>}</div>)}</div>}</section>
      </>}
      {tab==='settings'&&<>
        <section className="card"><h2><Home/>Mieszkanie</h2><div className="grid"><Field label="Adres / nazwa" value={settings.apartment} onChange={v=>setSettings({...settings,apartment:v})}/><Field label="Powierzchnia m²" value={settings.area} type="number" onChange={v=>setSettings({...settings,area:num(v)})}/><Field label="Liczba osób" value={settings.residents} type="number" onChange={v=>setSettings({...settings,residents:num(v)})}/></div><button className="secondary" onClick={async()=>{if(API)try{await apiPut('/api/settings',settings);setStatus('Ustawienia zapisane na serwerze.')}catch{setStatus('Zapisano lokalnie.')}}}>Zapisz dane</button><button className="secondary logout" onClick={logout}><LogOut size={16}/>Wyloguj się</button></section>
        <section className="card"><div className="cardHead"><div><h2><Settings/>Taryfy</h2><p>Zmiana obowiązuje od wybranego miesiąca. Stare miesiące pozostają bez zmian.</p></div><button className="add" onClick={saveTariff}><Plus size={17}/>Dodaj / zapisz</button></div><label className="wide">Taryfikator od miesiąca<input type="month" value={tariffMonth} onChange={e=>setTariffMonth(e.target.value)}/></label><div className="grid">{Object.entries(LABELS).map(([key,label])=><Field key={key} label={label+(key.includes('PerM2')?' zł/m²':key.includes('PerPerson')?' zł/os.':key==='cleaning'?' zł/lokal':' zł/jedn.')} value={activeTariff[key]} type="number" step="0.01" onChange={v=>updateTariff(key,v)}/>)}</div><div className="tariffHistory"><b>Historia zmian</b>{[...tariffs].sort((a,b)=>b.effectiveFrom.localeCompare(a.effectiveFrom)).map(t=><div key={t.effectiveFrom}><span>Od {t.effectiveFrom}</span><small>{money(t.values.coldWater)}/m³ woda · {money(t.values.sewage)}/m³ ścieki</small></div>)}</div></section>
      </>}
    </main>
  </div>
}
function AuthScreen({onAuth}){
  const [mode,setMode]=useState(()=>new URLSearchParams(window.location.search).get('reset')?'reset':'login');
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [password2,setPassword2]=useState('');
  const [showPass,setShowPass]=useState(false);
  const [msg,setMsg]=useState('');
  const [err,setErr]=useState('');
  const [verifyToken]=useState(()=>new URLSearchParams(window.location.search).get('verify'));
  const [resetToken]=useState(()=>new URLSearchParams(window.location.search).get('reset'));
  useEffect(()=>{if(!verifyToken)return;apiGet(`/api/auth/verify?token=${verifyToken}`).then(r=>{setMsg(r.message);window.history.replaceState({},'',window.location.pathname);}).catch(e=>setErr(e.response?.data?.error||'Błąd potwierdzenia'));},[verifyToken]);
  const submit=async e=>{
    e.preventDefault();setErr('');setMsg('');
    try{
      if(mode==='register'){
        const res=await axios.post(`${API}/api/auth/register`,{email,password});
        setMsg(res.data.devLink?`DEV: otwórz ${res.data.devLink}`:res.data.message);
      }else if(mode==='forgot'){
        const res=await axios.post(`${API}/api/auth/forgot-password`,{email});
        setMsg(res.data.message);
      }else if(mode==='reset'){
        if(password!==password2){setErr('Hasła nie są takie same');return;}
        const res=await axios.post(`${API}/api/auth/reset-password`,{token:resetToken,password});
        setMsg(res.data.message);
        window.history.replaceState({},'',window.location.pathname);
        setMode('login');setPassword('');setPassword2('');
      }else{
        const res=await axios.post(`${API}/api/auth/login`,{email,password});
        localStorage.setItem('mb-token',res.data.token);
        onAuth({token:res.data.token,onboarded:res.data.onboarded});
      }
    }catch(e2){setErr(e2.response?.data?.error||'Błąd połączenia z serwerem');}
  };
  const resend=async()=>{setErr('');setMsg('');try{const res=await axios.post(`${API}/api/auth/resend-verification`,{email});setMsg(res.data.message);}catch{setErr('Błąd połączenia');}};
  const title=mode==='forgot'?'Reset hasła':mode==='reset'?'Nowe hasło':mode==='register'?'Rejestracja':'Moje Media';
  const sub=mode==='forgot'?'Podaj e-mail — wyślemy link do resetu hasła.':mode==='reset'?'Wpisz nowe hasło do swojego konta.':mode==='register'?'Załóż konto, aby rozliczać swoje media.':'Domowe rozliczenia mediów — woda, ścieki, opłaty stałe.';
  return <div className="app authApp"><div className="authCard card"><div className="eyebrow">DOMOWE MEDIA</div><h1>{title}</h1><p className="authSub">{sub}</p><form onSubmit={submit}>{mode!=='reset'&&<label>Adres e-mail<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="jan@example.com"/></label>}{mode!=='forgot'&&<label>{mode==='reset'?'Nowe hasło':'Hasło'}<span className="passWrap"><input type={showPass?'text':'password'} required minLength={6} value={password} onChange={e=>setPassword(e.target.value)} placeholder="min. 6 znaków"/><button type="button" className="eye" onClick={()=>setShowPass(s=>!s)} tabIndex={-1}>{showPass?<EyeOff size={17}/>:<Eye size={17}/>}</button></span></label>}{mode==='reset'&&<label>Powtórz nowe hasło<span className="passWrap"><input type={showPass?'text':'password'} required minLength={6} value={password2} onChange={e=>setPassword2(e.target.value)} placeholder="jeszcze raz"/></span></label>}{err&&<div className="authErr">{err}{err.includes('Potwierdź')&&<button type="button" className="link" onClick={resend}>Wyślij link ponownie</button>}</div>}{msg&&<div className="authOk">{msg}</div>}<button className="primary" type="submit">{mode==='login'?'Zaloguj się':mode==='register'?'Załóż konto':mode==='forgot'?'Wyślij link':'Zapisz nowe hasło'}</button></form>{mode==='login'&&<button className="link" onClick={()=>{setMode('forgot');setErr('');setMsg('');}}>Nie pamiętasz hasła?</button>}<button className="link" onClick={()=>{setMode(mode==='register'?'login':'register');setErr('');setMsg('');}}>{mode==='register'?'Masz już konto? Zaloguj się':mode==='login'?'Nie masz konta? Zarejestruj się':'Wróć do logowania'}</button></div></div>;
}
function OnboardingScreen({onDone}){
  const [apartment,setApartment]=useState('');
  const [area,setArea]=useState('');
  const [residents,setResidents]=useState('');
  const [err,setErr]=useState('');
  const [busy,setBusy]=useState(false);
  const submit=async e=>{
    e.preventDefault();setErr('');setBusy(true);
    try{
      await axios.post(`${API}/api/auth/onboarding`,{apartment,area:num(area),residents:num(residents)});
      onDone({apartment,area:num(area),residents:num(residents)});
    }catch(e2){setErr(e2.response?.data?.error||'Błąd zapisu');}finally{setBusy(false);}
  };
  return <div className="app authApp"><div className="authCard card"><div className="eyebrow">PIERWSZE URUCHOMIENIE</div><h1>Twoje mieszkanie</h1><p className="authSub">Podaj podstawowe dane — posłużą do rozliczeń.</p><form onSubmit={submit}><label>Adres / nazwa<input required value={apartment} onChange={e=>setApartment(e.target.value)} placeholder="np. Słoneczna 12 / 4"/></label><label>Powierzchnia m²<input required inputMode="decimal" value={area} onChange={e=>setArea(e.target.value)} placeholder="np. 59,5"/></label><label>Liczba osób<input required inputMode="numeric" value={residents} onChange={e=>setResidents(e.target.value)} placeholder="np. 3"/></label>{err&&<div className="authErr">{err}</div>}<button className="primary" type="submit" disabled={busy}>{busy?'Zapisywanie…':'Zapisz i rozpocznij'}</button></form></div></div>;
}
function Row({name,value}){return <div className="row"><span>{name}</span><b>{money(value)}</b></div>}
function Field({label,value,onChange,type='text',step}){return <label>{label}<input type={type} step={step} value={value??''} onChange={e=>onChange(e.target.value)}/></label>}
function Empty(){return <div className="empty">Brak zapisanych miesięcy. Dodaj pierwsze wskazanie w zakładce „Bieżące”.</div>}

createRoot(document.getElementById('root')).render(<App/>);
