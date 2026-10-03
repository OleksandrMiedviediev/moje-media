import { useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { apiGet, apiPost } from '../api';

export function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState(() => new URLSearchParams(window.location.search).get('reset') ? 'reset' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [verifyToken] = useState(() => new URLSearchParams(window.location.search).get('verify'));
  const [resetToken] = useState(() => new URLSearchParams(window.location.search).get('reset'));

  useEffect(() => {
    if (!verifyToken) return;
    apiGet(`/api/auth/verify?token=${verifyToken}`)
      .then(r => { setMsg(r.message); window.history.replaceState({}, '', window.location.pathname); })
      .catch(e => setErr(e.response?.data?.error || 'Błąd potwierdzenia'));
  }, [verifyToken]);

  const submit = async e => {
    e.preventDefault(); setErr(''); setMsg('');
    try {
      if (mode === 'register') {
        const res = await apiPost('/api/auth/register', { email, password });
        setMsg(res.devLink ? `DEV: otwórz ${res.devLink}` : res.message);
      } else if (mode === 'forgot') {
        const res = await apiPost('/api/auth/forgot-password', { email });
        setMsg(res.message);
      } else if (mode === 'reset') {
        if (password !== password2) { setErr('Hasła nie są takie same'); return; }
        const res = await apiPost('/api/auth/reset-password', { token: resetToken, password });
        setMsg(res.message);
        window.history.replaceState({}, '', window.location.pathname);
        setMode('login'); setPassword(''); setPassword2('');
      } else {
        const res = await apiPost('/api/auth/login', { email, password });
        localStorage.setItem('mb-token', res.token);
        onAuth({ token: res.token, onboarded: res.onboarded });
      }
    } catch (e2) { setErr(e2.response?.data?.error || 'Błąd połączenia z serwerem'); }
  };

  const resend = async () => {
    setErr(''); setMsg('');
    try { const res = await apiPost('/api/auth/resend-verification', { email }); setMsg(res.message); }
    catch { setErr('Błąd połączenia'); }
  };

  const title = mode === 'forgot' ? 'Reset hasła' : mode === 'reset' ? 'Nowe hasło' : mode === 'register' ? 'Rejestracja' : 'Moje Media';
  const sub = mode === 'forgot' ? 'Podaj e-mail — wyślemy link do resetu hasła.'
    : mode === 'reset' ? 'Wpisz nowe hasło do swojego konta.'
    : mode === 'register' ? 'Załóż konto, aby rozliczać swoje media.'
    : 'Domowe rozliczenia mediów — woda, ścieki, opłaty stałe.';

  return (
    <div className="app authApp">
      <div className="authCard card">
        <div className="eyebrow">DOMOWE MEDIA</div>
        <h1>{title}</h1>
        <p className="authSub">{sub}</p>
        <form onSubmit={submit}>
          {mode !== 'reset' && (
            <label>Adres e-mail
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="jan@example.com" />
            </label>
          )}
          {mode !== 'forgot' && (
            <label>{mode === 'reset' ? 'Nowe hasło' : 'Hasło'}
              <span className="passWrap">
                <input type={showPass ? 'text' : 'password'} required minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder="min. 6 znaków" />
                <button type="button" className="eye" onClick={() => setShowPass(s => !s)} tabIndex={-1}>
                  {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </span>
            </label>
          )}
          {mode === 'reset' && (
            <label>Powtórz nowe hasło
              <span className="passWrap">
                <input type={showPass ? 'text' : 'password'} required minLength={6} value={password2} onChange={e => setPassword2(e.target.value)} placeholder="jeszcze raz" />
              </span>
            </label>
          )}
          {err && <div className="authErr">{err}{err.includes('Potwierdź') && <button type="button" className="link" onClick={resend}>Wyślij link ponownie</button>}</div>}
          {msg && <div className="authOk">{msg}</div>}
          <button className="primary" type="submit">
            {mode === 'login' ? 'Zaloguj się' : mode === 'register' ? 'Załóż konto' : mode === 'forgot' ? 'Wyślij link' : 'Zapisz nowe hasło'}
          </button>
        </form>
        {mode === 'login' && (
          <button className="link" onClick={() => { setMode('forgot'); setErr(''); setMsg(''); }}>Nie pamiętasz hasła?</button>
        )}
        <button className="link" onClick={() => { setMode(mode === 'register' ? 'login' : 'register'); setErr(''); setMsg(''); }}>
          {mode === 'register' ? 'Masz już konto? Zaloguj się' : mode === 'login' ? 'Nie masz konta? Zarejestruj się' : 'Wróć do logowania'}
        </button>
      </div>
    </div>
  );
}

export function OnboardingScreen({ onDone }) {
  const [apartment, setApartment] = useState('');
  const [area, setArea] = useState('');
  const [residents, setResidents] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async e => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const numArea = Number(String(area).replace(',', '.')) || 0;
      const numResidents = Number(String(residents).replace(',', '.')) || 0;
      await apiPost('/api/auth/onboarding', { apartment, area: numArea, residents: numResidents });
      onDone({ apartment, area: numArea, residents: numResidents });
    } catch (e2) { setErr(e2.response?.data?.error || 'Błąd zapisu'); }
    finally { setBusy(false); }
  };

  return (
    <div className="app authApp">
      <div className="authCard card">
        <div className="eyebrow">PIERWSZE URUCHOMIENIE</div>
        <h1>Twoje mieszkanie</h1>
        <p className="authSub">Podaj podstawowe dane — posłużą do rozliczeń.</p>
        <form onSubmit={submit}>
          <label>Adres / nazwa
            <input required value={apartment} onChange={e => setApartment(e.target.value)} placeholder="np. Słoneczna 12 / 4" />
          </label>
          <label>Powierzchnia m²
            <input required inputMode="decimal" value={area} onChange={e => setArea(e.target.value)} placeholder="np. 59,5" />
          </label>
          <label>Liczba osób
            <input required inputMode="numeric" value={residents} onChange={e => setResidents(e.target.value)} placeholder="np. 3" />
          </label>
          {err && <div className="authErr">{err}</div>}
          <button className="primary" type="submit" disabled={busy}>{busy ? 'Zapisywanie…' : 'Zapisz i rozpocznij'}</button>
        </form>
      </div>
    </div>
  );
}
