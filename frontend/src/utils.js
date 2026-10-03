export const money = n => `${Number(n || 0).toFixed(2).replace('.', ',')} zł`;

export const num = v => Number(String(v ?? '').replace(',', '.')) || 0;

export const monthNow = () => new Date().toISOString().slice(0, 7);

export const monthLabel = m => new Intl.DateTimeFormat('pl-PL', { month: 'long', year: 'numeric' }).format(new Date(`${m}-01T00:00:00`));

export const calc = (water, prev, settings, tariffs) => {
  const usage = Math.max(0, num(water) - num(prev));
  const variable = usage * (num(tariffs.coldWater) + num(tariffs.sewage));
  const fixed = num(tariffs.wastePerPerson) * num(settings.residents)
    + num(tariffs.maintenancePerM2) * num(settings.area)
    + num(tariffs.administrationPerM2) * num(settings.area)
    + num(tariffs.cleaning)
    + num(tariffs.stairLightPerPerson) * num(settings.residents)
    + num(tariffs.renovationPerM2) * num(settings.area);
  const breakdown = {
    water: usage * num(tariffs.coldWater),
    sewage: usage * num(tariffs.sewage),
    waste: num(tariffs.wastePerPerson) * num(settings.residents),
    maintenance: num(tariffs.maintenancePerM2) * num(settings.area),
    administration: num(tariffs.administrationPerM2) * num(settings.area),
    cleaning: num(tariffs.cleaning),
    light: num(tariffs.stairLightPerPerson) * num(settings.residents),
    renovation: num(tariffs.renovationPerM2) * num(settings.area)
  };
  return { usage, variable, fixed, total: variable + fixed, breakdown };
};

// EPC069-12 QR payload — сканируется любым банковским приложением (Erste George, mBank, PKO...)
export const epcQrPayload = ({ name, iban, amount, note }) => {
  const clean = s => String(s || '').replace(/[\n\r]/g, ' ').trim().slice(0, 70);
  const ibanClean = String(iban || '').replace(/\s/g, '').toUpperCase();
  const amt = Number(amount || 0).toFixed(2);
  return [
    'BCD',       // Service Tag
    '002',       // Version
    '1',         // Character set: UTF-8
    'SCT',       // SEPA Credit Transfer
    '',          // BIC (необязателен в SEPA)
    clean(name),
    ibanClean,
    `EUR${amt}`,
    '',          // Purpose
    '',          // Structured reference
    clean(note)  // Remittance info (unstructured)
  ].join('\n');
};
