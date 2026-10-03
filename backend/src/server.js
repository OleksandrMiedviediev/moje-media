import crypto from 'crypto';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import 'dotenv/config';

mongoose.set('bufferCommands', false);

const app = express();
const PORT = process.env.PORT || 10000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-me';
const allowed = (process.env.FRONTEND_URL || '*').split(',').map(s => s.trim());
app.use(cors({ origin: allowed.includes('*') ? true : allowed }));
app.use(express.json({ limit: '100kb' }));

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  verified: { type: Boolean, default: false },
  verifyToken: { type: String, default: null },
  resetToken: { type: String, default: null },
  resetTokenExpires: { type: Date, default: null },
  onboarded: { type: Boolean, default: false }
}, { timestamps: true });
const tariffSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  effectiveFrom: { type: String, required: true },
  values: { type: Object, required: true }
}, { timestamps: true });
const entrySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  month: { type: String, required: true },
  previousWater: { type: Number, default: 0 },
  currentWater: { type: Number, default: 0 },
  usage: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  breakdown: { type: Object, default: {} },
  tariffs: { type: Object, default: {} },
  note: { type: String, default: '' }
}, { timestamps: true });
entrySchema.index({ userId: 1, month: 1 }, { unique: true });
const settingsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  value: { type: Object }
}, { timestamps: true });
const User = mongoose.model('User', userSchema);
const Tariff = mongoose.model('Tariff', tariffSchema);
const Entry = mongoose.model('Entry', entrySchema);
const Setting = mongoose.model('Setting', settingsSchema);

const defaultSettings = {
  apartment: '', area: 0, residents: 1,
  labels: { coldWater: 'Zimna woda', sewage: 'Ścieki', wastePerPerson: 'Śmieci', maintenancePerM2: 'Konserwacja', administrationPerM2: 'Administracja', cleaning: 'Sprzątanie klatek', stairLightPerPerson: 'Światło klatki', renovationPerM2: 'Fundusz remontowy' }
};
const defaultTariffs = { coldWater: 8.47, sewage: 12.39, wastePerPerson: 40, maintenancePerM2: 1.10, administrationPerM2: 1.03, cleaning: 26, stairLightPerPerson: 2.40, renovationPerM2: 1.50 };

const signToken = user => jwt.sign({ sub: user._id.toString(), email: user.email }, JWT_SECRET, { expiresIn: '30d' });

async function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Brak tokena' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ error: 'Użytkownik nie istnieje' });
    req.user = user;
    next();
  } catch { res.status(401).json({ error: 'Nieprawidłowy token' }); }
}

const BREVO_API_KEY = process.env.BREVO_API_KEY;

async function sendEmail(to, subject, text) {
  if (!BREVO_API_KEY) {
    console.log(`[DEV] Email to ${to} | ${subject}\n${text}`);
    return;
  }
  const fromRaw = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@example.com';
  const match = fromRaw.match(/^(?:(.*?)\s*)?<([^>]+)>$/);
  const sender = match ? { name: match[1] || 'Moje Media', email: match[2] } : { email: fromRaw };
  const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sender, to: [{ email: to }], subject, textContent: text })
  });
  if (!resp.ok) throw new Error(`Brevo API ${resp.status}: ${await resp.text()}`);
}

const baseUrl = allowed[0] === '*' || !allowed[0] ? 'http://localhost:5173' : allowed[0];

async function sendVerificationEmail(email, token) {
  const link = `${baseUrl}/?verify=${token}`;
  await sendEmail(email, 'Moje Media — potwierdzenie adresu e-mail',
    `Witaj!\n\nPotwierdź swój adres e-mail klikając w link:\n${link}\n\nJeśli to nie Ty zakładałeś konto, zignoruj tę wiadomość.`);
}

async function sendPasswordResetEmail(email, token) {
  const link = `${baseUrl}/?reset=${token}`;
  await sendEmail(email, 'Moje Media — reset hasła',
    `Witaj!\n\nOtrzymaliśmy prośbę o zresetowanie hasła. Kliknij w link (ważny 1 godzinę):\n${link}\n\nJeśli to nie Ty prosiłeś o reset, zignoruj tę wiadomość — hasło pozostanie bez zmian.`);
}

const validEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

app.post('/api/auth/register', async (req, res) => {
  try {
    const email = String(req.body.email || '').toLowerCase().trim();
    const password = String(req.body.password || '');
    if (!validEmail(email)) return res.status(400).json({ error: 'Nieprawidłowy adres e-mail' });
    if (password.length < 6) return res.status(400).json({ error: 'Hasło musi mieć min. 6 znaków' });
    if (await User.findOne({ email })) return res.status(409).json({ error: 'Ten adres e-mail jest już zajęty' });
    const verifyToken = crypto.randomBytes(32).toString('hex');
    await User.create({ email, passwordHash: await bcrypt.hash(password, 10), verifyToken });
    try { await sendVerificationEmail(email, verifyToken); }
    catch (e) { console.error('Email send error:', e.message); }
    res.status(201).json({ ok: true, message: 'Sprawdź skrzynkę e-mail i potwierdź adres', devLink: BREVO_API_KEY ? undefined : `/?verify=${verifyToken}` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/auth/verify', async (req, res) => {
  try {
    const user = await User.findOne({ verifyToken: String(req.query.token || '') });
    if (!user) return res.status(400).json({ error: 'Nieprawidłowy lub wykorzystany link' });
    user.verified = true;
    user.verifyToken = null;
    await user.save();
    res.json({ ok: true, message: 'Adres e-mail potwierdzony. Możesz się zalogować.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/resend-verification', async (req, res) => {
  try {
    const email = String(req.body.email || '').toLowerCase().trim();
    const user = await User.findOne({ email });
    if (user && !user.verified) {
      user.verifyToken = crypto.randomBytes(32).toString('hex');
      await user.save();
      try { await sendVerificationEmail(email, user.verifyToken); }
      catch (e) { console.error('Email send error:', e.message); }
    }
    res.json({ ok: true, message: 'Jeśli konto istnieje, wysłaliśmy nowy link' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const email = String(req.body.email || '').toLowerCase().trim();
    const user = await User.findOne({ email });
    if (user) {
      user.resetToken = crypto.randomBytes(32).toString('hex');
      user.resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000);
      await user.save();
      try { await sendPasswordResetEmail(email, user.resetToken); }
      catch (e) { console.error('Email send error:', e.message); }
    }
    res.json({ ok: true, message: 'Jeśli konto istnieje, wysłaliśmy link do resetu hasła' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const token = String(req.body.token || '');
    const password = String(req.body.password || '');
    if (password.length < 6) return res.status(400).json({ error: 'Hasło musi mieć min. 6 znaków' });
    const user = await User.findOne({ resetToken: token, resetTokenExpires: { $gt: new Date() } });
    if (!user) return res.status(400).json({ error: 'Link jest nieprawidłowy lub wygasł' });
    user.passwordHash = await bcrypt.hash(password, 10);
    user.resetToken = null;
    user.resetTokenExpires = null;
    await user.save();
    res.json({ ok: true, message: 'Hasło zmienione. Możesz się zalogować.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const email = String(req.body.email || '').toLowerCase().trim();
    const password = String(req.body.password || '');
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.passwordHash)))
      return res.status(401).json({ error: 'Nieprawidłowy e-mail lub hasło' });
    if (!user.verified) return res.status(403).json({ error: 'Potwierdź najpierw adres e-mail (sprawdź skrzynkę)', needsVerification: true });
    res.json({ token: signToken(user), onboarded: user.onboarded, email: user.email });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/auth/me', auth, (req, res) => {
  res.json({ email: req.user.email, onboarded: req.user.onboarded });
});

app.post('/api/auth/onboarding', auth, async (req, res) => {
  try {
    const { apartment, area, residents } = req.body;
    if (!apartment || !String(apartment).trim()) return res.status(400).json({ error: 'Podaj adres / nazwę mieszkania' });
    if (!(Number(area) > 0)) return res.status(400).json({ error: 'Podaj powierzchnię w m²' });
    if (!(Number(residents) >= 1)) return res.status(400).json({ error: 'Podaj liczbę mieszkańców' });
    const value = { ...defaultSettings, apartment: String(apartment).trim(), area: Number(area), residents: Number(residents) };
    await Setting.findOneAndUpdate({ userId: req.user._id }, { value }, { upsert: true, new: true });
    const hasTariffs = await Tariff.exists({ userId: req.user._id });
    if (!hasTariffs) await Tariff.create({ userId: req.user._id, effectiveFrom: '2026-01', values: defaultTariffs });
    req.user.onboarded = true;
    await req.user.save();
    res.json({ ok: true, settings: value });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/health', (_, res) => res.json({ ok: true, database: mongoose.connection.readyState === 1 }));

app.get('/api/settings', auth, async (req, res) => {
  try {
    const doc = await Setting.findOne({ userId: req.user._id });
    res.json(doc?.value || defaultSettings);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/settings', auth, async (req, res) => {
  try {
    const doc = await Setting.findOneAndUpdate({ userId: req.user._id }, { value: req.body }, { upsert: true, new: true });
    res.json(doc.value);
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.get('/api/tariffs', auth, async (req, res) => {
  try {
    const docs = await Tariff.find({ userId: req.user._id }).sort({ effectiveFrom: 1 });
    res.json(docs.length ? docs : [{ effectiveFrom: '2026-01', values: defaultTariffs }]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/tariffs', auth, async (req, res) => {
  try {
    if (!/^\d{4}-\d{2}$/.test(req.body.effectiveFrom)) return res.status(400).json({ error: 'effectiveFrom must be YYYY-MM' });
    const doc = await Tariff.findOneAndUpdate(
      { userId: req.user._id, effectiveFrom: req.body.effectiveFrom },
      { values: req.body.values },
      { upsert: true, new: true }
    );
    res.json(doc);
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/tariffs/:id', auth, async (req, res) => { try { await Tariff.findOneAndDelete({ _id: req.params.id, userId: req.user._id }); res.sendStatus(204); } catch (e) { res.status(400).json({ error: e.message }); } });
app.get('/api/entries', auth, async (req, res) => { try { res.json(await Entry.find({ userId: req.user._id }).sort({ month: -1 })); } catch (e) { res.status(500).json({ error: e.message }); } });
app.put('/api/entries/:month', auth, async (req, res) => {
  try {
    const body = { ...req.body };
    delete body.userId;
    const doc = await Entry.findOneAndUpdate(
      { userId: req.user._id, month: req.params.month },
      body,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json(doc);
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/entries/:month', auth, async (req, res) => { try { await Entry.findOneAndDelete({ userId: req.user._id, month: req.params.month }); res.sendStatus(204); } catch (e) { res.status(400).json({ error: e.message }); } });

if (process.env.MONGODB_URI) mongoose.connect(process.env.MONGODB_URI).then(() => console.log('MongoDB connected')).catch(err => console.error('MongoDB connection error:', err.message));
else console.warn('MONGODB_URI is not set. API runs, but persistent data is unavailable.');
if (!process.env.JWT_SECRET) console.warn('JWT_SECRET is not set. Using an insecure development secret.');
app.listen(PORT, () => console.log(`API listening on ${PORT}`));
