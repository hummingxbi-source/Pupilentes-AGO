// Cloudflare Turnstile (modo explícito). El token se valida en el servidor (Edge Functions).
// Llave del sitio: VITE_TURNSTILE_SITE_KEY (en desarrollo, la de prueba de Cloudflare que siempre aprueba).
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

const LLAVE = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';
const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let cargando = null;
function cargar() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  cargando ??= new Promise((ok, mal) => {
    const s = document.createElement('script');
    s.src = SCRIPT; s.async = true; s.onload = () => ok(window.turnstile); s.onerror = () => { cargando = null; s.remove(); mal(new Error('turnstile')); };
    document.head.appendChild(s);
  });
  return cargando;
}

// Si la verificación no carga (bloqueador de anuncios, red que bloquea Cloudflare) o da error, se dice en el
// mismo lugar del widget y se puede reintentar; antes solo quedaba el botón apagado (hallazgo H6).
export const AVISO_TURNSTILE = 'No pudimos cargar la verificación de seguridad. Si usas un bloqueador de anuncios, desactívalo para este sitio o cambia de red, y recarga la página.';

/** Widget de verificación. `alCambiar(token|null)`. ref.reiniciar() pide un token nuevo (cada uno sirve una vez). */
export const Turnstile = forwardRef(function Turnstile({ alCambiar, accion }, ref) {
  const caja = useRef(null);
  const id = useRef(null);
  const [falla, setFalla] = useState(false);
  const [intento, setIntento] = useState(0);
  useImperativeHandle(ref, () => ({ reiniciar: () => { alCambiar(null); if (id.current != null) window.turnstile?.reset(id.current); } }), [alCambiar]);
  useEffect(() => {
    let vivo = true;
    if (!LLAVE) { alCambiar(null); return undefined; }
    const fallar = () => { alCambiar(null); if (vivo) setFalla(true); };
    cargar().then((t) => {
      if (!vivo || !caja.current) return;
      id.current = t.render(caja.current, {
        sitekey: LLAVE, action: accion, language: 'es', theme: 'light', size: 'flexible',
        callback: (tok) => { setFalla(false); alCambiar(tok); }, 'expired-callback': () => alCambiar(null), 'error-callback': fallar,
      });
    }).catch(fallar);
    return () => { vivo = false; if (id.current != null) window.turnstile?.remove(id.current); id.current = null; };
    // Solo al montar y al reintentar: volver a pintar el widget en cada render pediría otro token.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intento]);
  if (!LLAVE) return <p className="err" role="alert">Falta configurar la verificación (VITE_TURNSTILE_SITE_KEY).</p>;
  return (<>
    <div ref={caja} className="turnstile" hidden={falla} />
    {falla && <div className="turnstile-falla" role="alert">
      <p className="err" style={{ marginTop: 0 }}>{AVISO_TURNSTILE}</p>
      <button type="button" className="btn sm ghost" style={{ marginTop: 8 }} onClick={() => { setFalla(false); setIntento((n) => n + 1); }}>Reintentar</button>
    </div>}
  </>);
});
