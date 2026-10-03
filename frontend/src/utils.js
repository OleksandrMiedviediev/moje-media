export const money = n => `${Number(n || 0).toFixed(2).replace('.', ',')} zł`;

export const num = v => Number(String(v ?? '').replace(',', '.')) || 0;

export const monthNow = () => new Date().toISOString().slice(0, 7);

export const monthLabel = m => new Intl.DateTimeFormat('pl-PL', { month: 'long', year: 'numeric' }).format(new Date(`${m}-01T00:00:00`));

export const calc = (water, prev, settings, tariffs, customReadings = {}, newMeters = {}) => {
  const usage = Math.max(0, num(water) - num(prev));
  // Тариф: значение может быть числом или {value, active}
  const t = key => {
    const v = tariffs[key];
    if (v && typeof v === 'object') return v.active === false ? 0 : num(v.value);
    return num(v);
  };
  const variable = usage * (t('coldWater') + t('sewage'));
  const fixed = t('wastePerPerson') * num(settings.residents)
    + t('maintenancePerM2') * num(settings.area)
    + t('administrationPerM2') * num(settings.area)
    + t('cleaning')
    + t('stairLightPerPerson') * num(settings.residents)
    + t('renovationPerM2') * num(settings.area);
  const breakdown = {
    water: usage * t('coldWater'),
    sewage: usage * t('sewage'),
    waste: t('wastePerPerson') * num(settings.residents),
    maintenance: t('maintenancePerM2') * num(settings.area),
    administration: t('administrationPerM2') * num(settings.area),
    cleaning: t('cleaning'),
    light: t('stairLightPerPerson') * num(settings.residents),
    renovation: t('renovationPerM2') * num(settings.area)
  };

  // Кастомные позиции: счётчики (meter) и фиксированные оплаты (fixed)
  const custom = {};
  let customTotal = 0;
  (settings.customItems || []).forEach(item => {
    if (!item.active) return;
    if (item.type === 'meter') {
      const curr = num(customReadings[item.id]);
      const prevVal = newMeters[item.id] ? 0 : num(item.lastValue); // новый счётчик — от нуля
      const itemUsage = Math.max(0, curr - prevVal);
      const cost = itemUsage * num(item.rate);
      custom[item.id] = { usage: itemUsage, cost, name: item.name, unit: item.unit };
      customTotal += cost;
    } else {
      const cost = num(item.amount);
      custom[item.id] = { cost, name: item.name, unit: item.unit };
      customTotal += cost;
    }
  });

  return { usage, variable, fixed, total: variable + fixed + customTotal, breakdown, custom, customTotal };
};

// Польский стандарт ZBP (płatność QR) — PKO, mBank, ING PL, Santander, Erste PL...
export const toIban = raw => {
  const s = String(raw || '').replace(/\s/g, '').toUpperCase();
  if (/^\d{26}$/.test(s)) return `PL${s}`;
  return s;
};

// Номер счёта БЕЗ префикса PL (для ZBP поле 3)
export const accountNumber = raw => {
  const s = String(raw || '').replace(/\s/g, '').toUpperCase();
  return s.startsWith('PL') ? s.slice(2) : s;
};

export const zbpQrPayload = ({ name, iban, amount, note, nip }) => {
  const clean = s => String(s || '').replace(/[\n\r]/g, ' ').trim();
  const account = accountNumber(iban);
  const grosze = String(Math.round(Number(amount || 0) * 100)).padStart(9, '0');
  const nipClean = String(nip || '').replace(/\D/g, '');
  return `${nipClean}|PL|${account}|${grosze}|${clean(name)}|${clean(note)}|||`;
};
