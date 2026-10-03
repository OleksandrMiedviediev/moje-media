import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import 'dotenv/config';

mongoose.set('bufferCommands', false);

const app = express();
const PORT = process.env.PORT || 10000;
const allowed = (process.env.FRONTEND_URL || '*').split(',').map(s => s.trim());
app.use(cors({ origin: allowed.includes('*') ? true : allowed }));
app.use(express.json({ limit: '100kb' }));

const tariffSchema = new mongoose.Schema({
  effectiveFrom: { type: String, required: true },
  values: { type: Object, required: true }
}, { timestamps: true });
const entrySchema = new mongoose.Schema({
  month: { type: String, required: true, unique: true },
  previousWater: { type: Number, default: 0 },
  currentWater: { type: Number, default: 0 },
  usage: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  breakdown: { type: Object, default: {} },
  tariffs: { type: Object, default: {} },
  note: { type: String, default: '' }
}, { timestamps: true });
const settingsSchema = new mongoose.Schema({ key: { type: String, unique: true }, value: { type: Object } }, { timestamps: true });
const Tariff = mongoose.model('Tariff', tariffSchema);
const Entry = mongoose.model('Entry', entrySchema);
const Setting = mongoose.model('Setting', settingsSchema);

const defaultSettings = {
  apartment: 'Wiejska 3 / 6', area: 59.51, residents: 3,
  labels: { coldWater: 'Zimna woda', sewage: 'Ścieki', wastePerPerson: 'Śmieci', maintenancePerM2: 'Konserwacja', administrationPerM2: 'Administracja', cleaning: 'Sprzątanie klatek', stairLightPerPerson: 'Światło klatki', renovationPerM2: 'Fundusz remontowy' }
};
const defaultTariffs = { coldWater: 8.47, sewage: 12.39, wastePerPerson: 40, maintenancePerM2: 1.10, administrationPerM2: 1.03, cleaning: 26, stairLightPerPerson: 2.40, renovationPerM2: 1.50 };

app.get('/api/health', (_, res) => res.json({ ok: true, database: mongoose.connection.readyState === 1 }));
app.get('/api/settings', async (_, res) => {
  try {
    const doc = await Setting.findOne({ key: 'app' });
    res.json(doc?.value || defaultSettings);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/settings', async (req, res) => {
  try {
    const doc = await Setting.findOneAndUpdate({ key: 'app' }, { value: req.body }, { upsert: true, new: true });
    res.json(doc.value);
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.get('/api/tariffs', async (_, res) => {
  try {
    const docs = await Tariff.find().sort({ effectiveFrom: 1 });
    res.json(docs.length ? docs : [{ effectiveFrom: '2026-01', values: defaultTariffs }]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/tariffs', async (req, res) => {
  try {
    if (!/^\d{4}-\d{2}$/.test(req.body.effectiveFrom)) return res.status(400).json({ error: 'effectiveFrom must be YYYY-MM' });
    const doc = await Tariff.findOneAndUpdate({ effectiveFrom: req.body.effectiveFrom }, { values: req.body.values }, { upsert: true, new: true });
    res.json(doc);
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/tariffs/:id', async (req, res) => { try { await Tariff.findByIdAndDelete(req.params.id); res.sendStatus(204); } catch (e) { res.status(400).json({ error: e.message }); } });
app.get('/api/entries', async (_, res) => { try { res.json(await Entry.find().sort({ month: -1 })); } catch (e) { res.status(500).json({ error: e.message }); } });
app.put('/api/entries/:month', async (req, res) => {
  try {
    const doc = await Entry.findOneAndUpdate({ month: req.params.month }, req.body, { upsert: true, new: true, setDefaultsOnInsert: true });
    res.json(doc);
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/entries/:month', async (req, res) => { try { await Entry.findOneAndDelete({ month: req.params.month }); res.sendStatus(204); } catch (e) { res.status(400).json({ error: e.message }); } });

if (process.env.MONGODB_URI) mongoose.connect(process.env.MONGODB_URI).then(() => console.log('MongoDB connected')).catch(err => console.error('MongoDB connection error:', err.message));
else console.warn('MONGODB_URI is not set. API runs, but persistent data is unavailable.');
app.listen(PORT, () => console.log(`API listening on ${PORT}`));
