export const DEFAULT_SETTINGS = { apartment: 'Słoneczna 12 / 4', area: 59.51, residents: 3, waterGoalPerPerson: 3, payeeName: '', payeeIban: '', paymentNote: '' };

export const DEFAULT_TARIFFS = { coldWater: 8.47, sewage: 12.39, wastePerPerson: 40, maintenancePerM2: 1.10, administrationPerM2: 1.03, cleaning: 26, stairLightPerPerson: 2.40, renovationPerM2: 1.50 };

export const LABELS = { coldWater: 'Zimna woda', sewage: 'Ścieki', wastePerPerson: 'Śmieci', maintenancePerM2: 'Konserwacja', administrationPerM2: 'Administracja', cleaning: 'Sprzątanie klatek', stairLightPerPerson: 'Światło klatki', renovationPerM2: 'Fundusz remontowy' };

export const API = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '';
