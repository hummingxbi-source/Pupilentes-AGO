import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(<App />);

// Solo en desarrollo: confirma en la consola que el backend local responde (Fase 0).
if (import.meta.env.DEV) {
  import('./lib/api').then(({ comprobarSalud }) => comprobarSalud())
    .then((r) => console.info('[AGO] Backend OK:', r))
    .catch((e) => console.warn('[AGO] Backend sin conexión:', e.codigo || e.message, '· ¿corriste `supabase start` y `supabase functions serve`?'));
}
