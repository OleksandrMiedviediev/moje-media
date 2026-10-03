import { money } from '../utils';

export function Row({ name, value }) {
  return <div className="row"><span>{name}</span><b>{money(value)}</b></div>;
}

export function Field({ label, value, onChange, type = 'text', step }) {
  return <label>{label}<input type={type} step={step} value={value ?? ''} onChange={e => onChange(e.target.value)} /></label>;
}

export function Empty() {
  return <div className="empty">Brak zapisanych miesięcy. Dodaj pierwsze wskazanie w zakładce „Bieżące”.</div>;
}

