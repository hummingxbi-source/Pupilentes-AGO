import { useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ArrowRight, LogOut, Gift, RotateCcw, MapPin, Truck } from 'lucide-react';
import { useStore, normTel, puntosDe, nivelDe, NIVELES, PUNTO_MXN } from '../lib/store';
import { ESTADOS, PASOS, mxn } from '../lib/catalog';
import { useProductos, varianteDe, NEUTRO } from '../lib/tienda';
import { LOGO, TLink, Iris } from '../ui';

export default function Cuenta() {
  const { sesion, clientes, pedidos, login, logout, guardarCliente, agregar, notificar } = useStore();
  const productos = useProductos();
  const root = useRef();
  const [tel, setTel] = useState(''); const [code, setCode] = useState(''); const [fase, setFase] = useState('tel'); const [nuevoNombre, setNuevoNombre] = useState('');
  const c = sesion && clientes[sesion];
  const pts = c ? puntosDe(sesion, pedidos, clientes) : 0;
  const nivel = nivelDe(pts); const sig = NIVELES[NIVELES.indexOf(nivel) + 1];
  const mios = sesion ? pedidos.filter((p) => normTel(p.tel) === sesion) : [];
  const ultimo = mios.find((p) => p.items.some((i) => productos.find((x) => x.id === i.id)?.tipo === 'lente'));
  const renov = ultimo ? new Date(new Date(ultimo.fecha).getTime() + 335 * 864e5) : null;
  const [perfil, setPerfil] = useState({ correo: c?.correo || '', cumple: c?.cumple || '' });

  useGSAP(() => {
    gsap.from('.ac-in', { y: 40, opacity: 0, stagger: 0.07, duration: 1, ease: 'expo.out', delay: 0.6 });
    const card = root.current.querySelector('.club');
    if (card) {
      const rx = gsap.quickTo(card, 'rotationX', { duration: 0.6 }), ry = gsap.quickTo(card, 'rotationY', { duration: 0.6 });
      const mv = (e) => { const r = card.getBoundingClientRect(); ry(((e.clientX - r.left) / r.width - 0.5) * 14); rx(-((e.clientY - r.top) / r.height - 0.5) * 14); };
      card.addEventListener('pointermove', mv); card.addEventListener('pointerleave', () => { rx(0); ry(0); });
      const o = { v: 0 }; gsap.to(o, { v: pts, duration: 1.8, ease: 'power2.out', delay: 0.8, onUpdate: () => { const el = card.querySelector('.pts'); if (el) el.textContent = Math.round(o.v); } });
    }
  }, { scope: root, dependencies: [sesion, fase] });

  if (!c) return (
    <main className="ac" ref={root}><div className="wrap ac-login">
      <div className="ac-in">
        <p className="eyebrow">Mi cuenta</p>
        <h1 className="h-l" style={{ margin: '12px 0 16px' }}>Tus puntos y tus pedidos, <span className="it gold">con tu número.</span></h1>
        <p className="lead">Sin contraseñas: entra con tu WhatsApp y te mandamos un código.</p>
      </div>
      <div className="box ac-in ac-form">
        {fase === 'tel' && <>
          <div className="field" style={{ marginTop: 0 }}><label>Tu WhatsApp</label><input className="inp mono" inputMode="tel" value={tel} onChange={(e) => setTel(e.target.value)} placeholder="55 1234 5678" style={{ fontSize: 20, height: 56 }} /></div>
          <button className="btn full" style={{ marginTop: 14 }} onClick={() => normTel(tel).length === 10 ? setFase('code') : notificar('Escribe tu número a 10 dígitos')}>Enviarme el código</button>
          <p className="mute" style={{ fontSize: 13, marginTop: 10 }}>Demo: clienta registrada <button className="link" onClick={() => setTel('5512345678')}>55 1234 5678</button></p>
        </>}
        {fase === 'code' && <>
          <p style={{ marginBottom: 10 }}>Te mandamos un código de 4 dígitos al <b className="mono">{tel}</b>.</p>
          <input className="inp mono" inputMode="numeric" maxLength={4} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="••••" style={{ fontSize: 30, letterSpacing: '.6em', textAlign: 'center', height: 64 }} />
          <p className="mute" style={{ fontSize: 13, margin: '8px 0 12px' }}>Demo: cualquier código de 4 dígitos funciona.</p>
          <button className="btn full" disabled={code.length < 4} onClick={() => { const t = normTel(tel); if (clientes[t]) login(t); else setFase('nueva'); }}>Entrar</button>
        </>}
        {fase === 'nueva' && <>
          <p style={{ marginBottom: 10 }}>No encontramos compras con ese número. <b>¿Abrimos tu cuenta?</b> Te regalamos 50 puntos.</p>
          <input className="inp" value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} placeholder="Tu nombre" />
          <button className="btn full" style={{ marginTop: 12 }} disabled={nuevoNombre.trim().length < 3} onClick={() => { const t = normTel(tel); guardarCliente({ tel: t, nombre: nuevoNombre, puntosBase: 50, direcciones: [] }); login(t); }}>Crear mi cuenta</button>
        </>}
      </div>
    </div></main>
  );

  const completo = c.correo && c.cumple;
  return (
    <main className="ac" ref={root}><div className="wrap">
      <div className="ac-head ac-in"><div><p className="eyebrow">Mi cuenta</p><h1 className="h-l" style={{ marginTop: 10 }}>Hola, <span className="it gold">{c.nombre.split(' ')[0]}</span></h1></div><button className="btn ghost sm" onClick={logout}><LogOut size={16} /> Salir</button></div>
      <div className="ac-grid">
        <div>
          <div className="club-wrap ac-in"><div className="club">
            <div className="club-top"><img src={LOGO} alt="" /><span>AGO CLUB · {nivel.id.toUpperCase()}</span></div>
            <div><span className="pts">0</span><span className="u">puntos</span></div>
            <div className="club-bot"><span>{c.nombre}</span><span>= {mxn(pts * PUNTO_MXN)} para tu próxima compra</span></div>
          </div></div>
          {sig && <div className="ac-in" style={{ marginTop: 16 }}><div className="sum" style={{ fontSize: 14 }}><span>Nivel {nivel.id}</span><span className="mono">{sig.min - pts} pts para {sig.id}</span></div><div className="road"><b style={{ transform: `scaleX(${(pts - nivel.min) / (sig.min - nivel.min)})` }} /></div></div>}
          <section className="panel-card ac-in" style={{ marginTop: 22 }}>
            <h3>Cómo sumar</h3>
            <div className="ac-rules"><span><b>1 pt</b> por cada $10</span><span><b>$0.50</b> vale cada punto</span><span><b>+50</b> al completar tu perfil</span><span><b>Dorado</b> desde 300 pts: envío prioritario</span></div>
          </section>
          {!completo ? (
            <section className="panel-card ac-in"><h3><span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Gift size={18} className="gold" /> Completa tu perfil</span><small>+50 puntos</small></h3>
              <div className="two"><div className="field" style={{ marginTop: 0 }}><label>Correo</label><input className="inp" value={perfil.correo} onChange={(e) => setPerfil({ ...perfil, correo: e.target.value })} /></div><div className="field" style={{ marginTop: 0 }}><label>Cumpleaños</label><input className="inp" type="date" value={perfil.cumple} onChange={(e) => setPerfil({ ...perfil, cumple: e.target.value })} /></div></div>
              <button className="btn sm" style={{ marginTop: 14 }} disabled={!perfil.correo || !perfil.cumple} onClick={() => { guardarCliente({ ...c, ...perfil, puntosBase: (c.puntosBase || 0) + 50 }); notificar('¡Listo! Sumaste 50 puntos'); }}>Guardar y ganar 50 pts</button>
            </section>
          ) : <section className="panel-card ac-in"><h3>Tu perfil <small>completo ✓</small></h3><p className="mute" style={{ fontSize: 14 }}>{c.correo} · cumpleaños {new Date(c.cumple + 'T12:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })} (te llega un regalo ese mes)</p></section>}
        </div>
        <div>
          <section className="panel-card ac-in"><h3>Tus pedidos <small>{mios.length}</small></h3>
            {!mios.length && <p className="mute">Aún no tienes pedidos. <TLink to="/tienda" className="link">Ver la tienda</TLink></p>}
            {mios.map((p) => { const k = PASOS.indexOf(p.estado); return (
              <TLink key={p.folio} to={`/pedido/${p.folio}`} className="ac-ped">
                <div><b>{p.items[0].nombre}{p.items.length > 1 ? ` + ${p.items.length - 1}` : ''}</b><small className="mono">{p.folio} · {new Date(p.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</small>
                  <div className="dots">{PASOS.map((s, i) => <i key={s} className={i <= k ? 'on' : ''} />)}<span>{ESTADOS[p.estado].label}{p.guia ? ` · guía ${p.guia}` : ''}</span></div></div>
                <span className="mono">{mxn(p.total)}</span>
              </TLink>); })}
          </section>
          <div className="ac-2">
            <section className="panel-card ac-in"><h3>Tu graduación</h3>
              <div className="eyes"><div className="eye-sel"><div className="lb"><span>OD</span></div><b className="mono" style={{ fontSize: 24 }}>{c.receta?.od || '—'}</b></div><div className="eye-sel"><div className="lb"><span>OI</span></div><b className="mono" style={{ fontSize: 24 }}>{c.receta?.oi || '—'}</b></div></div>
              {ultimo && <button className="btn sm full" style={{ marginTop: 14 }} onClick={() => { const it = ultimo.items[0]; const p = productos.find((x) => x.id === it.id); const g = it.graduacion ?? it.od ?? NEUTRO; const v = p && (varianteDe(p, it.duracion ?? p.duraciones.at(-1) ?? null, g) || p.variantes.find((x) => x.graduacion === g)); if (!v || !v.disponible) { notificar('Ese par no está disponible ahorita'); return; } agregar({ id: p.id, sku: v.sku, nombre: p.nombre, alias: p.alias, duracion: v.duracion, graduacion: g, od: g, oi: g, cant: 1, precio: v.precio }); }}><RotateCcw size={15} /> Repetir mi último par</button>}
            </section>
            <section className="panel-card ac-in"><h3>Renovación</h3>
              {renov ? <><div className="big-n">{Math.max(0, Math.round((renov - Date.now()) / 864e5))}<span style={{ fontSize: 16 }} className="mute"> días</span></div><p className="mute" style={{ fontSize: 13.5, marginTop: 6 }}>Tus {ultimo.items[0].nombre} cumplen su año el {renov.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })}. Te avisamos por WhatsApp.</p></> : <p className="mute">Sin lentes activos.</p>}
            </section>
          </div>
          <section className="panel-card ac-in"><h3>Direcciones guardadas</h3>
            {(c.direcciones || []).map((d, i) => <div key={i} className="alert-row"><span style={{ display: 'flex', gap: 10, alignItems: 'center' }}><MapPin size={16} className="gold" />{d.calle}, {d.colonia}</span><span className="mono mute">CP {d.cp}</span></div>)}
            {!c.direcciones?.length && <p className="mute" style={{ fontSize: 14 }}>Se guardan automáticamente en tu próxima compra.</p>}
          </section>
        </div>
      </div>
    </div></main>
  );
}
