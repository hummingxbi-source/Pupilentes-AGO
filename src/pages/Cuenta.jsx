import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { LogOut, Gift, RotateCcw, MapPin, Mail } from 'lucide-react';
import { useStore } from '../lib/store';
import { mxn } from '../lib/catalog';
import { useProductos } from '../lib/tienda';
import { ESTADO_CLIENTA, PASOS_CLIENTA } from '../lib/pedidos';
import { useCuenta, iniciarCuenta, nivelDe, NIVELES, MOTIVOS, paraRecomprar, derivados } from '../lib/cuenta';
import { Turnstile } from '../lib/Turnstile';
import { LOGO, TLink } from '../ui';

// Cuenta de clienta (Fase 7): código por correo, puntos reales e historial. La cuenta es opcional (D5).
const fecha = (f, o = { day: 'numeric', month: 'short', year: 'numeric' }) => new Date(f).toLocaleDateString('es-MX', o);

function Entrar() {
  const { pedirCodigo, verificar, error } = useCuenta();
  const ts = useRef();
  const [token, setToken] = useState(null);
  const [correo, setCorreo] = useState('');
  const [codigo, setCodigo] = useState('');
  const [fase, setFase] = useState('correo');
  const [enviando, setEnviando] = useState(false);
  const correoOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo.trim());

  const enviar = async (e) => {
    e.preventDefault(); if (!correoOk || !token || enviando) return;
    setEnviando(true);
    const ok = await pedirCodigo(correo, token);
    setEnviando(false); ts.current?.reiniciar();   // cada token sirve una vez
    if (ok) setFase('codigo');
  };
  const entrar = async (e) => {
    e.preventDefault(); if (codigo.length !== 6 || enviando) return;
    setEnviando(true); await verificar(correo, codigo); setEnviando(false);
  };

  return (
    <div className="wrap ac-login">
      <div className="ac-in">
        <p className="eyebrow">Mi cuenta</p>
        <h1 className="h-l" style={{ margin: '12px 0 16px' }}>Tus puntos y tus pedidos, <span className="it gold">con tu correo.</span></h1>
        <p className="lead">Sin contraseñas: te mandamos un código de 6 dígitos. No necesitas cuenta para comprar; con ella juntas puntos y ves tus pedidos.</p>
      </div>
      <div className="box ac-in ac-form">
        {fase === 'correo' && <form onSubmit={enviar}>
          <div className="field" style={{ marginTop: 0 }}><label htmlFor="ac-correo">Tu correo</label>
            <input id="ac-correo" className="inp" type="email" autoComplete="email" maxLength={254} value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="tu@correo.com" style={{ fontSize: 18, height: 56 }} /></div>
          <div style={{ marginTop: 14 }}><Turnstile ref={ts} accion="cuenta" alCambiar={setToken} /></div>
          {error && <p className="err" role="alert">{error}</p>}
          <button className="btn full" style={{ marginTop: 14 }} disabled={!correoOk || !token || enviando}><Mail size={16} /> {enviando ? 'Enviando…' : 'Enviarme el código'}</button>
          <p className="mute" style={{ fontSize: 13, marginTop: 10 }}>Si compraste como invitada con este correo, tus pedidos aparecen solos al entrar.</p>
        </form>}
        {fase === 'codigo' && <form onSubmit={entrar}>
          <p style={{ marginBottom: 10 }}>Te mandamos un código de 6 dígitos a <b>{correo.trim().toLowerCase()}</b>. Vence en 10 minutos.</p>
          <input className="inp mono" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))} placeholder="••••••" style={{ fontSize: 30, letterSpacing: '.5em', textAlign: 'center', height: 64 }} aria-label="Código" />
          {error && <p className="err" role="alert">{error}</p>}
          <button className="btn full" style={{ marginTop: 12 }} disabled={codigo.length !== 6 || enviando}>{enviando ? 'Entrando…' : 'Entrar'}</button>
          <button type="button" className="mute" style={{ fontSize: 13, marginTop: 10 }} onClick={() => { setFase('correo'); setCodigo(''); }}>Cambiar correo o pedir otro código</button>
        </form>}
      </div>
    </div>
  );
}

function Perfil({ perfil, reglas }) {
  const { guardarPerfil, error } = useCuenta();
  const [f, setF] = useState({ nombre: perfil.nombre || '', cumpleanos: perfil.cumpleanos || '', telefono: perfil.telefono || '' });
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState('');
  const completo = perfil.nombre && perfil.cumpleanos;
  const guardar = async (e) => {
    e.preventDefault(); setEnviando(true); setAviso('');
    try {
      const r = await guardarPerfil({ nombre: f.nombre.trim(), cumpleanos: f.cumpleanos || '', telefono: f.telefono.replace(/\D/g, '') });
      setAviso(r.bono ? `¡Listo! Sumaste ${reglas.bono_perfil} puntos.` : 'Guardado.');
    } catch (e2) { setAviso(e2.message || 'No se pudo guardar.'); } finally { setEnviando(false); }
  };
  const bono = reglas.activos && reglas.bono_perfil > 0 && !reglas.bono_recibido;
  return (
    <section className="panel-card ac-in"><h3><span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{bono && <Gift size={18} className="gold" />} {completo ? 'Tu perfil' : 'Completa tu perfil'}</span>
      {bono && <small>+{reglas.bono_perfil} puntos</small>}</h3>
      <form onSubmit={guardar}>
        <div className="field" style={{ marginTop: 0 }}><label htmlFor="pf-nombre">Nombre</label><input id="pf-nombre" className="inp" maxLength={120} value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} /></div>
        <div className="two">
          <div className="field"><label htmlFor="pf-cumple">Cumpleaños</label><input id="pf-cumple" className="inp" type="date" disabled={!!perfil.cumpleanos} value={f.cumpleanos} onChange={(e) => setF({ ...f, cumpleanos: e.target.value })} /></div>
          <div className="field"><label htmlFor="pf-tel">WhatsApp <span className="mute">(opcional)</span></label><input id="pf-tel" className="inp mono" inputMode="tel" value={f.telefono} onChange={(e) => setF({ ...f, telefono: e.target.value.replace(/[^\d ]/g, '').slice(0, 14) })} /></div>
        </div>
        {bono && <p className="note">El bono se suma cuando tu perfil está completo y ya tienes una compra pagada.</p>}
        {(aviso || error) && <p className={aviso.startsWith('¡') || aviso === 'Guardado.' ? 'note' : 'err'} role="status">{aviso || error}</p>}
        <button className="btn sm" style={{ marginTop: 14 }} disabled={enviando || f.nombre.trim().length < 2}>{enviando ? 'Guardando…' : 'Guardar'}</button>
      </form>
    </section>
  );
}

export default function Cuenta() {
  const { estado, datos, error, salir, correo } = useCuenta();
  const { agregar, notificar } = useStore();
  const productos = useProductos();
  const root = useRef();
  useEffect(() => { iniciarCuenta(); }, []);

  const pts = datos?.saldo ?? 0;
  const nivel = nivelDe(Math.max(pts, 0)); const sig = NIVELES[NIVELES.indexOf(nivel) + 1];
  const reglas = datos?.reglas;
  const pedidos = datos?.pedidos || [];
  const { lente, renovacion, direcciones, ultimo } = derivados(pedidos);

  useGSAP(() => {
    if (!root.current) return;
    gsap.from('.ac-in', { y: 40, opacity: 0, stagger: 0.07, duration: 1, ease: 'expo.out', delay: 0.2 });
    const card = root.current.querySelector('.club');
    if (card) {
      const rx = gsap.quickTo(card, 'rotationX', { duration: 0.6 }), ry = gsap.quickTo(card, 'rotationY', { duration: 0.6 });
      const mv = (e) => { const r = card.getBoundingClientRect(); ry(((e.clientX - r.left) / r.width - 0.5) * 14); rx(-((e.clientY - r.top) / r.height - 0.5) * 14); };
      card.addEventListener('pointermove', mv); card.addEventListener('pointerleave', () => { rx(0); ry(0); });
    }
  }, { scope: root, dependencies: [estado, !!datos] });

  // Contador de puntos: sube desde lo que ya se ve hasta el saldo actual, también cuando cambia sin recargar
  // (p. ej. al sumar el bono del perfil; hallazgo H7).
  const ptsVisto = useRef(0);
  const hayDatos = !!datos;
  useEffect(() => {
    const el = root.current?.querySelector('.club .pts');
    if (!el || !hayDatos) return undefined;
    const o = { v: ptsVisto.current };
    const tw = gsap.to(o, { v: pts, duration: 1.8, ease: 'power2.out', delay: ptsVisto.current ? 0 : 0.4,
      onUpdate: () => { el.textContent = Math.round(o.v); }, onComplete: () => { ptsVisto.current = pts; } });
    return () => { tw.kill(); ptsVisto.current = Math.round(o.v); };
  }, [pts, hayDatos]);

  const recomprar = (p) => {
    const { agregables, faltan } = paraRecomprar(p, productos);
    agregables.forEach((it) => agregar(it));
    if (!agregables.length) notificar('Esas piezas no están disponibles ahorita');
    else if (faltan.length) notificar(`Agregamos lo disponible. Sin existencias: ${faltan.join(', ')}`);
  };

  if (estado === 'sin_configurar') return <main className="ac"><div className="wrap empty"><p className="err">Falta configurar la conexión con la tienda (VITE_SUPABASE_URL).</p></div></main>;
  if (estado === 'cargando') return <main className="ac"><div className="wrap empty"><p className="mute" role="status">Cargando…</p></div></main>;
  if (estado === 'fuera') return <main className="ac" ref={root}><Entrar /></main>;
  if (!datos) return (
    <main className="ac"><div className="wrap empty">
      {error ? <><p className="err" role="alert">{error}</p><button className="btn ghost sm" style={{ marginTop: 12 }} onClick={salir}><LogOut size={16} /> Salir</button></> : <p className="mute" role="status">Cargando tu cuenta…</p>}
    </div></main>
  );

  const perfil = datos.perfil;
  const nombre = (perfil.nombre || correo || '').split(/[\s@]/)[0];
  return (
    <main className="ac" ref={root}><div className="wrap">
      <div className="ac-head ac-in"><div><p className="eyebrow">Mi cuenta</p><h1 className="h-l" style={{ marginTop: 10 }}>Hola, <span className="it gold">{nombre}</span></h1></div><button className="btn ghost sm" onClick={salir}><LogOut size={16} /> Salir</button></div>
      {datos.vinculados > 0 && <p className="note ac-in">Encontramos {datos.vinculados} {datos.vinculados === 1 ? 'pedido' : 'pedidos'} que hiciste como invitada con este correo y los agregamos a tu cuenta.</p>}
      <div className="ac-grid">
        <div>
          <div className="club-wrap ac-in"><div className="club">
            <div className="club-top"><img src={LOGO} alt="" /><span>AGO CLUB · {nivel.id.toUpperCase()}</span></div>
            <div><span className="pts">0</span><span className="u">puntos</span></div>
            <div className="club-bot"><span>{perfil.nombre || perfil.correo}</span><span>= {mxn(Math.max(pts, 0) * Number(reglas.valor))} para tu próxima compra</span></div>
          </div></div>
          {sig && <div className="ac-in" style={{ marginTop: 16 }}><div className="sum" style={{ fontSize: 14 }}><span>Nivel {nivel.id}</span><span className="mono">{sig.min - Math.max(pts, 0)} pts para {sig.id}</span></div><div className="road"><b style={{ transform: `scaleX(${(Math.max(pts, 0) - nivel.min) / (sig.min - nivel.min)})` }} /></div></div>}
          {reglas.activos && <section className="panel-card ac-in" style={{ marginTop: 22 }}>
            <h3>Cómo sumar</h3>
            <div className="ac-rules"><span><b>1 pt</b> por cada {mxn(Number(reglas.pesos_por_punto))}</span><span><b>{mxn(Number(reglas.valor))}</b> vale cada punto</span>
              {reglas.bono_perfil > 0 && <span><b>+{reglas.bono_perfil}</b> al completar tu perfil</span>}<span>Úsalos para pagar hasta el <b>{reglas.max_pct}%</b> de tus productos</span></div>
          </section>}
          {/* key estable: si cambiara con el nombre o el cumpleaños, el formulario se volvería a montar al guardar
              y el aviso de "Guardado." o del bono desaparecería sin verse (hallazgo H7). */}
          <Perfil key={perfil.correo} perfil={perfil} reglas={reglas} />
          {datos.movimientos?.length > 0 && <section className="panel-card ac-in"><h3>Movimientos de puntos</h3>
            {datos.movimientos.slice(0, 12).map((m, i) => <div key={i} className="alert-row"><span>{MOTIVOS[m.motivo] || m.motivo}{m.folio ? <span className="mono mute"> · {m.folio}</span> : null}<small className="mute" style={{ display: 'block' }}>{fecha(m.fecha)}</small></span>
              <span className={'mono ' + (m.delta > 0 ? 'gold' : 'mute')}>{m.delta > 0 ? '+' : ''}{m.delta}</span></div>)}
          </section>}
        </div>
        <div>
          <section className="panel-card ac-in"><h3>Tus pedidos <small>{pedidos.length}</small></h3>
            {!pedidos.length && <p className="mute">Aún no tienes pedidos. <TLink to="/tienda" className="link">Ver la tienda</TLink></p>}
            {pedidos.map((p) => { const e = ESTADO_CLIENTA[p.estado] || { titulo: p.estado }; return (
              <div key={p.folio} className="ac-ped">
                <TLink to={`/pedido/${p.token}`} style={{ flex: 1 }}>
                  <b>{p.items?.[0]?.tono || p.items?.[0]?.producto}{p.items?.length > 1 ? ` + ${p.items.length - 1}` : ''}</b><small className="mono">{p.folio} · {fecha(p.fecha)}</small>
                  <div className="dots">{!e.fin && PASOS_CLIENTA.map((s, i) => <i key={s} className={i <= e.paso ? 'on' : ''} />)}<span>{e.titulo}{p.guia?.guia ? ` · guía ${p.guia.guia}` : ''}</span></div>
                </TLink>
                <span style={{ textAlign: 'right' }}><span className="mono">{mxn(Number(p.total))}</span>
                  {p.puntos_usados > 0 && <small className="mute" style={{ display: 'block' }}>{p.puntos_usados} pts usados</small>}
                  <button className="link" style={{ fontSize: 13, display: 'flex', gap: 4, alignItems: 'center', marginTop: 4 }} onClick={() => recomprar(p)}><RotateCcw size={13} /> Repetir</button></span>
              </div>); })}
          </section>
          <div className="ac-2">
            <section className="panel-card ac-in"><h3>Tu último par</h3>
              {lente ? <><div className="big-n" style={{ fontSize: 28 }}>{lente.graduacion == null || Number(lente.graduacion) === 0 ? 'Sin graduación' : Number(lente.graduacion).toFixed(2)}</div>
                <p className="mute" style={{ fontSize: 13.5, marginTop: 6 }}>{lente.tono || lente.producto} · el par</p>
                <button className="btn sm full" style={{ marginTop: 14 }} onClick={() => recomprar(ultimo)}><RotateCcw size={15} /> Repetir mi último par</button></>
                : <p className="mute">Aún no compras lentes con tu cuenta.</p>}
            </section>
            <section className="panel-card ac-in"><h3>Renovación</h3>
              {renovacion ? <><div className="big-n">{renovacion.dias}<span style={{ fontSize: 16 }} className="mute"> días</span></div><p className="mute" style={{ fontSize: 13.5, marginTop: 6 }}>Tus {renovacion.nombre} cumplen su ciclo el {fecha(renovacion.fecha, { day: 'numeric', month: 'long' })}.</p></> : <p className="mute">Sin lentes activos.</p>}
            </section>
          </div>
          <section className="panel-card ac-in"><h3>Direcciones de tus envíos</h3>
            {direcciones.map((d, i) => <div key={i} className="alert-row"><span style={{ display: 'flex', gap: 10, alignItems: 'center' }}><MapPin size={16} className="gold" />{d.calle}{d.numero ? ` ${d.numero}` : ''}, {d.colonia}</span><span className="mono mute">CP {d.cp}</span></div>)}
            {!direcciones.length && <p className="mute" style={{ fontSize: 14 }}>Cuando compres con paquetería estando en tu cuenta, tu dirección aparece aquí y la puedes reusar en la caja.</p>}
          </section>
        </div>
      </div>
    </div></main>
  );
}
