import React from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './styles.css';

// Авто-перезагрузка при новой версии — чтобы SW не отдавал старый бандл
registerSW({ onNeedRefresh() { window.location.reload(); } });

createRoot(document.getElementById('root')).render(<App />);
