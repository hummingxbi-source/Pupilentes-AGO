// Cloudflare Turnstile (modo explícito). El token se valida en el servidor (Edge Functions).
// Llave del sitio: VITE_TURNSTILE_SITE_KEY (en desarrollo, la de prueba de Cloudflare que siempre aprueba).
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

const LLAVE = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';
const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let cargando = null;
function cargar() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  cargando ??= new Promise((ok, mal) => {
    const s = document.createElement('script');
    s.src = SCRIPT; s.async = true; s.onload = () => ok(window.turnstile); s.onerror = () => { cargando = null; mal(new Error('turnstile')); };
    document.head.appendChild(s);
  });
  return cargando;
}

/** Widget de verificación. `alCambiar(token|null)`. ref.reiniciar() pide un token nuevo (cada uno sirve una vez). */
export const Turnstile = forwardRef(function Turnstile({ alCambiar, accion }, ref) {
  const caja = useRef(null);
  const id = useRef(null);
  useImperativeHandle(ref, () => ({ reiniciar: () => { alCambiar(null); if (id.current != null) window.turnstile?.reset(id.current); } }), [alCambiar]);
  useEffect(() => {
    let vivo = true;
    if (!LLAVE) { alCambiar(null); return undefined; }
    cargar().then((t) => {
      if (!vivo || !caja.current) return;
      id.current = t.render(caja.current, {
        sitekey: LLAVE, action: accion, language: 'es', theme: 'light', size: 'flexible',
        callback: (tok) => alCambiar(tok), 'expired-callback': () => alCambiar(null), 'error-callback': () => alCambiar(null),
      });
    }).catch(() => alCambiar(null));
    return () => { vivo = false; if (id.current != null) window.turnstile?.remove(id.current); id.current = null; };
  }, []);
  if (!LLAVE) return <p className="err" role="alert">Falta configurar la verificación (VITE_TURNSTILE_SITE_KEY).</p>;
  return <div ref={caja} className="turnstile" />;
});
