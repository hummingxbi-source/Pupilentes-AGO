import { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, ArrowUp, Sparkles } from 'lucide-react';
import gsap from 'gsap';
import { QUICK, respuestaLocal, waHandoff } from '../lib/chatbot-kb';
import { LOGO } from '../ui';

// Asistente de la tienda.
// · Los botones rápidos se contestan aquí mismo: cero costo y no gastan preguntas.
// · El texto libre va a /api/chat (IA) con un número limitado de preguntas por sesión.
// · Si la API no existe (hosting estático) o no tiene clave, cae a "modo básico" por palabras clave.

const API = (import.meta.env.VITE_CHAT_API || '') + '/api/chat';
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;
const SS = 'ago-chat-v1';
const BIENVENIDA = { role: 'assistant', text: '¡Hola! Soy el asistente de Pupilentes AGO. Toca una opción o escríbeme tu duda.', local: true };

const leerSS = () => { try { return JSON.parse(sessionStorage.getItem(SS)) || null; } catch { return null; } };
const guardarSS = (v) => { try { sessionStorage.setItem(SS, JSON.stringify(v)); } catch { /* sin storage */ } };

// Turnstile: CAPTCHA invisible de Cloudflare; solo se carga si hay site key
let tsScript;
function tokenTurnstile(el) {
  if (!SITE_KEY) return Promise.resolve(null);
  tsScript ??= new Promise((ok, err) => {
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true; s.onload = ok; s.onerror = err; document.head.appendChild(s);
  });
  return tsScript.then(() => new Promise((ok) => {
    window.turnstile.render(el, { sitekey: SITE_KEY, appearance: 'interaction-only', callback: ok, 'error-callback': () => ok(null) });
  }));
}

async function api(body) {
  const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, ...j };
}

export default function ChatBot({ visible = true }) {
  const guardado = leerSS();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState(guardado?.msgs || [BIENVENIDA]);
  const [token, setToken] = useState(guardado?.token || null);
  const [restantes, setRestantes] = useState(guardado?.restantes ?? null);
  const [basico, setBasico] = useState(false); // sin IA disponible
  const [texto, setTexto] = useState('');
  const [cargando, setCargando] = useState(false);
  const [nuevo, setNuevo] = useState(false);
  const panel = useRef(); const body = useRef(); const ts = useRef(); const input = useRef();

  useEffect(() => guardarSS({ msgs: msgs.slice(-30), token, restantes }), [msgs, token, restantes]);
  useEffect(() => { body.current?.scrollTo({ top: body.current.scrollHeight, behavior: 'smooth' }); }, [msgs, cargando, open]);
  useEffect(() => {
    if (!open) return;
    gsap.fromTo(panel.current, { y: 24, opacity: 0, scale: 0.98 }, { y: 0, opacity: 1, scale: 1, duration: 0.45, ease: 'expo.out' });
    setNuevo(false);
    if (window.innerWidth > 600) setTimeout(() => input.current?.focus(), 200);
    const k = (e) => e.key === 'Escape' && setOpen(false);
    addEventListener('keydown', k); return () => removeEventListener('keydown', k);
  }, [open]);
  // invitación discreta a los 12 s si no lo han abierto
  useEffect(() => { const t = setTimeout(() => !leerSS()?.token && setNuevo(true), 12000); return () => clearTimeout(t); }, []);

  const agregar = (...m) => setMsgs((prev) => [...prev, ...m]);

  async function iniciar() {
    const j = await api({ accion: 'iniciar', turnstile: await tokenTurnstile(ts.current) });
    if (j.token) { setToken(j.token); setRestantes(j.restantes); if (!j.ia) setBasico(true); return j.token; }
    if (j.error === 'limite-ip') throw Object.assign(new Error('limite'), { limite: true });
    throw new Error(j.error || 'inicio');
  }

  function rapido(q) {
    agregar({ role: 'user', text: q.chip, local: true }, { role: 'assistant', text: q.a, local: true });
  }

  function modoBasico(pregunta) {
    setBasico(true);
    const r = respuestaLocal(pregunta);
    agregar({ role: 'assistant', text: r.text, handoff: r.handoff, pregunta, local: true });
  }

  async function enviar(e) {
    e?.preventDefault();
    const t = texto.trim();
    if (!t || cargando || restantes === 0) return;
    setTexto('');
    agregar({ role: 'user', text: t });
    if (basico) return modoBasico(t);
    setCargando(true);
    try {
      let tk = token || (await iniciar());
      // historial: solo lo que pasó por la IA o por botones, sin la bienvenida
      const historial = msgs.filter((m) => m !== BIENVENIDA && !m.aviso).map(({ role, text }) => ({ role, text }));
      let j = await api({ accion: 'mensaje', token: tk, texto: t, historial });
      if (j.status === 401) { tk = await iniciar(); j = await api({ accion: 'mensaje', token: tk, texto: t, historial }); }
      if (j.respuesta) {
        agregar({ role: 'assistant', text: j.respuesta, handoff: j.handoff, pregunta: t });
        setRestantes(j.restantes);
        if (j.restantes === 0) agregar({ role: 'assistant', aviso: true, handoff: true, pregunta: t, text: 'Llegaste al límite de preguntas del chat. Si aún tienes dudas, te atendemos por WhatsApp. Los botones de arriba siguen funcionando.' });
      } else if (j.error === 'sin-ia' || j.status === 404) modoBasico(t);
      else if (j.error === 'limite-sesion' || j.error === 'limite-ip') { setRestantes(0); agregar({ role: 'assistant', aviso: true, handoff: true, pregunta: t, text: 'Llegaste al límite de preguntas del chat por hoy. Para lo que necesites, escríbenos por WhatsApp.' }); }
      else if (j.error === 'rapido') agregar({ role: 'assistant', aviso: true, text: 'Vas muy rápido 🙂 espera unos segundos e inténtalo de nuevo.' });
      else if (j.error === 'largo') agregar({ role: 'assistant', aviso: true, text: `Tu mensaje es muy largo; resúmelo en menos de ${j.max} caracteres, por favor.` });
      else agregar({ role: 'assistant', aviso: true, handoff: true, pregunta: t, text: 'No pude responder en este momento. Escríbenos por WhatsApp y te ayudamos.' });
    } catch (err) {
      if (err.limite) { setRestantes(0); agregar({ role: 'assistant', aviso: true, handoff: true, pregunta: t, text: 'Llegaste al límite del chat por hoy. Escríbenos por WhatsApp.' }); }
      else modoBasico(t); // sin API (sitio estático): respuestas básicas
    } finally { setCargando(false); }
  }

  const agotado = restantes === 0;
  return (
    <>
      <button className={`chat-fab ${visible || open ? '' : 'oculto'}`} onClick={() => setOpen(!open)} aria-label={open ? 'Cerrar asistente' : 'Abrir asistente de la tienda'} aria-expanded={open}>
        {open ? <X size={22} /> : <MessageCircle size={22} strokeWidth={1.6} />}
        {nuevo && !open && <span className="chat-dot" />}
      </button>
      {nuevo && !open && visible && <button className="chat-hint" onClick={() => setOpen(true)}>¿Dudas? Te respondo al momento</button>}

      {open && (
        <section className="chat-panel" ref={panel} role="dialog" aria-label="Asistente de Pupilentes AGO">
          <header className="chat-h">
            <img src={LOGO} alt="" />
            <div><b>Asistente AGO</b><span>{basico ? 'Respuestas básicas' : 'Responde al momento'}</span></div>
            <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Cerrar"><X size={20} /></button>
          </header>

          <div className="chat-b" ref={body} data-lenis-prevent aria-live="polite">
            {msgs.map((m, i) => (
              <div key={i} className={`chat-m ${m.role} ${m.aviso ? 'aviso' : ''}`}>
                <p>{m.text}</p>
                {m.handoff && <a className="chat-wa" href={waHandoff(m.pregunta)} target="_blank" rel="noreferrer"><MessageCircle size={15} /> Seguir por WhatsApp</a>}
              </div>
            ))}
            {cargando && <div className="chat-m assistant"><p className="chat-typing"><i /><i /><i /></p></div>}
          </div>

          <div className="chat-chips" data-lenis-prevent>
            {QUICK.map((q) => <button key={q.id} onClick={() => rapido(q)}>{q.chip}</button>)}
          </div>

          <form className="chat-f" onSubmit={enviar}>
            <input ref={input} value={texto} onChange={(e) => setTexto(e.target.value.slice(0, 400))} disabled={agotado}
              placeholder={agotado ? 'Sigue por WhatsApp o usa los botones' : 'Escribe tu duda…'} aria-label="Tu pregunta" enterKeyHint="send" />
            <button type="submit" disabled={!texto.trim() || cargando || agotado} aria-label="Enviar"><ArrowUp size={18} /></button>
          </form>
          <div className="chat-pie">
            {basico ? <span>Modo básico (sin IA)</span>
              : restantes != null && !agotado ? <span><Sparkles size={12} /> Te {restantes === 1 ? 'queda 1 pregunta' : `quedan ${restantes} preguntas`}</span>
              : <span>Respuestas automáticas</span>}
            <a href={waHandoff()} target="_blank" rel="noreferrer">Hablar con la tienda</a>
          </div>
          <div ref={ts} className="chat-ts" />
        </section>
      )}
    </>
  );
}
