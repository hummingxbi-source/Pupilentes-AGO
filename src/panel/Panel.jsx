import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Route, Routes, Link, useNavigate, useSearchParams } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Sun, Truck, Boxes, LayoutGrid, Users, ArrowUpRight, Copy, Search, X, LogOut } from 'lucide-react';
import { mxn } from '../lib/catalog';
import { NEUTRO } from '../lib/tienda';
import { useStore } from '../lib/store';
import { LOGO, Iris } from '../ui';
import Acceso from './Acceso';
import { useSesion, iniciarSesionPanel } from './sesion';
import { useConsulta, cargarPedidos, cargarVariantes, agrupar, ESTADOS_PEDIDO } from './datos';
import { Inventario, Catalogo, Clientas } from './Gestion';

export const waTo = (tel, txt) => `https://wa.me/52${String(tel).replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(txt)}`;
const nombreDe = (p) => p.contacto?.nombre || 'Sin nombre';

/** Panel protegido: sin sesión con MFA y rol, solo se ve la pantalla de acceso. */
export default function Panel() {
  const { estado, rol, usuario, salir } = useSesion();
  useEffect(() => iniciarSesionPanel(), []);
  if (estado !== 'dentro') return <Acceso />;
  const tabs = [
    ['', 'Hoy', Sun],
    ['pedidos', 'Pedidos', Truck],
    ['inventario', 'Inventario', Boxes],
    ['catalogo', 'Catálogo', LayoutGrid],
    ['clientas', 'Clientas', Users],
  ];
  return (
    <div className="pn">
      <aside className="pn-side">
        <Link to="/" className="brand"><img src={LOGO} alt="" />AGO · PANEL</Link>
        {tabs.map(([to, l, I]) => <NavLink key={to} end to={to ? `/panel/${to}` : '/panel'} className={({ isActive }) => 'it ' + (isActive ? 'on' : '')}><I size={18} strokeWidth={1.5} />{l}</NavLink>)}
        <div className="bottom">
          <span style={{ fontSize: 12, opacity: 0.75 }}>{usuario?.email}<br />{rol === 'duena' ? 'Dueña' : 'Ayudante'}</span>
          <button style={{ marginTop: 10, color: 'inherit', fontSize: 13, display: 'flex', gap: 6, alignItems: 'center' }} onClick={() => salir()}><LogOut size={14} /> Salir</button>
          <Link to="/" style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 10 }}>Ver tienda <ArrowUpRight size={14} /></Link>
        </div>
      </aside>
      <nav className="pn-tabs">{tabs.map(([to, l, I]) => <NavLink key={to} end to={to ? `/panel/${to}` : '/panel'} className={({ isActive }) => (isActive ? 'on' : '')}><I size={20} strokeWidth={1.5} />{l}</NavLink>)}</nav>
      <main className="pn-main">
        <Routes>
          <Route index element={<Hoy />} />
          <Route path="pedidos" element={<Pedidos />} />
          <Route path="inventario" element={<Inventario />} />
          <Route path="catalogo" element={<Catalogo />} />
          <Route path="clientas" element={<Clientas />} />
        </Routes>
      </main>
    </div>
  );
}

export function useEntrada(dep) {
  const ref = useRef();
  useGSAP(() => { gsap.fromTo(ref.current.querySelectorAll('[data-in]'), { y: 24, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.05, duration: 0.8, ease: 'expo.out' }); }, { scope: ref, dependencies: dep || [] });
  return ref;
}

export function Estado({ cargando, error, recargar }) {
  if (cargando) return <p className="mute" role="status">Cargando…</p>;
  if (error) return <div role="alert"><p>No se pudo cargar: {error}</p><button className="btn sm ghost" style={{ marginTop: 8 }} onClick={recargar}>Reintentar</button></div>;
  return null;
}

/* ---------------- HOY ---------------- */
function Hoy() {
  const ped = useConsulta(cargarPedidos);
  const inv = useConsulta(cargarVariantes);
  const nav = useNavigate();
  const [abierto, setAbierto] = useState(null);
  const ref = useEntrada([ped.cargando, inv.cargando]);
  const h = new Date().getHours();
  const saludo = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  const pedidos = ped.datos || [];
  const cuenta = (...e) => pedidos.filter((p) => e.includes(p.estado));

  const mes = useMemo(() => {
    const ini = new Date(); ini.setDate(1); ini.setHours(0, 0, 0, 0);
    const este = pedidos.filter((p) => p.pago_estado === 'aprobado' && new Date(p.creado_en) >= ini);
    const total = este.reduce((s, p) => s + Number(p.total), 0);
    const canales = {}; este.forEach((p) => (canales[p.canal] = (canales[p.canal] || 0) + 1));
    return { total, n: este.length, ticket: este.length ? total / este.length : 0, canales: Object.entries(canales).sort((a, b) => b[1] - a[1]) };
  }, [pedidos]);

  // Se están acabando: lentes activos con 1 par o menos disponible
  const bajos = useMemo(() => (inv.datos || [])
    .filter((v) => v.activo && v.producto.tipo === 'lente' && v.tono?.activo && v.disponible <= 1)
    .sort((a, b) => a.disponible - b.disponible || a.sku.localeCompare(b.sku)), [inv.datos]);
  const grupos = useMemo(() => agrupar(inv.datos || []), [inv.datos]);
  const tonoDe = (v) => grupos.find((g) => g.clave === v.tono?.id);
  const listaProv = 'Pedido para proveedor:\n' + bajos.slice(0, 30).map((b) => `• ${b.tono.nombre} ${b.grad === NEUTRO ? 'sin graduación' : b.grad}${b.duracion ? ` (${b.duracion})` : ''} — quedan ${b.disponible}`).join('\n');
  const porValidar = cuenta('pendiente_validacion');

  return (
    <div ref={ref}>
      <div className="pn-h" data-in>
        <div><p className="eyebrow">{new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}</p><h1>{saludo}, <span className="it">equipo AGO</span></h1>
          <p>{porValidar.length ? `Tienes ${porValidar.length} pagos por validar.` : 'Sin pagos por validar.'} {bajos.length ? `${bajos.length} variantes con 1 par o menos.` : ''}</p></div>
      </div>
      <div className="kpis">
        {[
          ['pendiente_validacion', porValidar.length, 'Pagos por validar', 'Transferencias', true],
          ['pagado', cuenta('pagado', 'preparando').length, 'Por enviar', 'Pagados'],
          ['enviado', cuenta('enviado').length, 'En camino', 'Con guía'],
          ['pagado_sin_stock', cuenta('pagado_sin_stock', 'contracargo').length, 'Requieren atención', 'Sin stock o contracargo', true],
        ].map(([f, n, l, s, hot], i) => (
          <button key={i} data-in className={'kpi ' + (hot && n ? 'hot' : '')} onClick={() => nav(`/panel/pedidos?e=${f}`)}><span className="n">{n}</span><span className="l">{l}</span><span className="s">{s}</span></button>
        ))}
      </div>
      <Estado {...ped} />
      <div className="pn-cols">
        <div>
          <section className="panel-card" data-in>
            <h3>Pedidos recientes <small>los más nuevos</small></h3>
            {!ped.cargando && !pedidos.length && <p className="mute">Aún no hay pedidos. La compra en línea se activa en la Fase 3.</p>}
            {pedidos.slice(0, 6).map((p) => (
              <div className="task" key={p.id}><span className="ic mono" style={{ fontSize: 11 }}>{p.folio.slice(-4)}</span><div><b>{nombreDe(p)}</b><small>{ESTADOS_PEDIDO[p.estado]?.label} · {mxn(p.total)} · {p.canal}</small></div><button className="btn sm ghost" onClick={() => setAbierto(p)}>Ver</button></div>
            ))}
          </section>
          <section className="panel-card" data-in>
            <h3>Se están acabando <small>1 par o menos</small></h3>
            <Estado {...inv} />
            {!inv.cargando && !bajos.length && <p className="mute">Todo bien surtido.</p>}
            {bajos.slice(0, 8).map((b) => (
              <div className="alert-row" key={b.id}><span style={{ display: 'flex', gap: 10, alignItems: 'center' }}><Iris p={tonoDe(b)} glint={false} />{b.tono.nombre}</span><span className="mono">{b.grad === NEUTRO ? 'Sin grad.' : b.grad} · <b style={{ color: b.disponible ? 'var(--gold-d)' : 'var(--bad)' }}>{b.disponible}</b></span></div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
              {bajos.length > 0 && <button className="btn sm" onClick={() => { navigator.clipboard?.writeText(listaProv); useStore.getState().notificar('Lista copiada para tu proveedor'); }}><Copy size={15} /> Copiar lista para proveedor</button>}
              <Link to="/panel/inventario" className="btn sm ghost">Abrir inventario</Link>
            </div>
          </section>
        </div>
        <div>
          <section className="panel-card" data-in>
            <h3>Este mes <small>pagos aprobados</small></h3>
            <div className="big-n">{mxn(mes.total)}</div>
            <div style={{ display: 'flex', gap: 14, marginTop: 6, fontSize: 13.5, color: 'var(--mute)', flexWrap: 'wrap' }}><span>{mes.n} pedidos</span><span>Ticket {mxn(mes.ticket)}</span></div>
          </section>
          <section className="panel-card" data-in>
            <h3>¿De dónde vienen? <small>pedidos del mes</small></h3>
            {!mes.canales.length && <p className="mute">Sin ventas este mes todavía.</p>}
            <div className="bars">{mes.canales.map(([k, v]) => <div className="bar" key={k}><span>{k}</span><span className="tr"><b style={{ width: `${(v / mes.canales[0][1]) * 100}%` }} /></span><span className="v">{v}</span></div>)}</div>
          </section>
        </div>
      </div>
      {abierto && <OrderModal p={abierto} onClose={() => setAbierto(null)} />}
    </div>
  );
}

/* ---------------- PEDIDOS ---------------- */
function Pedidos() {
  const ped = useConsulta(cargarPedidos);
  const pedidos = ped.datos || [];
  const [qs, setQs] = useSearchParams();
  const f = qs.get('e') || 'activos';
  const [q, setQ] = useState('');
  const [abierto, setAbierto] = useState(null);
  const ref = useEntrada([f, ped.cargando]);
  const activos = (p) => !['entregado', 'cancelado', 'expirado', 'reembolsado'].includes(p.estado);
  const filtros = [['activos', 'Activos'], ['pendiente_validacion', 'Por validar'], ['pagado', 'Por enviar'], ['enviado', 'En camino'], ['entregado', 'Entregados'], ['todos', 'Todos']];
  const pasa = (p, k) => (k === 'todos' ? true : k === 'activos' ? activos(p) : p.estado === k);
  const lista = pedidos.filter((p) => pasa(p, f) && (!q || (nombreDe(p) + p.folio + (p.contacto?.telefono || '')).toLowerCase().includes(q.toLowerCase())));
  return (
    <div ref={ref}>
      <div className="pn-h" data-in><div><h1>Pedidos</h1><p>Pedidos de la tienda y de los demás canales.</p></div>
        <label className="fsel" style={{ width: 'min(100%,280px)' }}><Search size={16} /><input className="inp" style={{ border: 0, height: 36, background: 'transparent' }} placeholder="Nombre, folio o teléfono" value={q} onChange={(e) => setQ(e.target.value)} /></label>
      </div>
      <div className="frow" style={{ marginBottom: 18 }} data-in>{filtros.map(([k, l]) => <button key={k} className={'chip ' + (f === k ? 'on' : '')} onClick={() => setQs({ e: k })}>{l} <span className="mono" style={{ opacity: 0.6 }}>{pedidos.filter((p) => pasa(p, k)).length}</span></button>)}</div>
      <Estado {...ped} />
      <div className="orders">{lista.slice(0, 100).map((p) => (
        <button className="order order-h" key={p.id} data-in onClick={() => setAbierto(p)}>
          <div><div className="who">{nombreDe(p)}</div><div className="sub"><span className="mono">{p.folio}</span><span>{new Date(p.creado_en).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</span><span>{p.canal}</span></div></div>
          <div style={{ textAlign: 'right' }}><span className={'pill-st ' + (ESTADOS_PEDIDO[p.estado]?.clase || '')}>{ESTADOS_PEDIDO[p.estado]?.label || p.estado}</span><div className="mono" style={{ marginTop: 8 }}>{mxn(p.total)}</div></div>
        </button>))}
        {!ped.cargando && !lista.length && <p className="empty">{pedidos.length ? 'No hay pedidos aquí.' : 'Aún no hay pedidos. La compra en línea se activa en la Fase 3.'}</p>}
      </div>
      {abierto && <OrderModal p={abierto} onClose={() => setAbierto(null)} />}
    </div>
  );
}

/* ---------- Detalle de pedido (solo lectura; las acciones llegan en las Fases 3 y 4) ---------- */
export function OrderModal({ p, onClose }) {
  const box = useRef();
  useGSAP(() => { gsap.fromTo(box.current, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'expo.out' }); }, { scope: box });
  const tel = p.contacto?.telefono;
  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="scrim" onClick={onClose} />
      <div className="mbox" ref={box}>
        <button className="icon-btn" style={{ position: 'absolute', right: 12, top: 12 }} onClick={onClose} aria-label="Cerrar"><X size={20} /></button>
        <p className="eyebrow">{p.folio} · {p.canal}</p>
        <h2 className="h-s" style={{ fontSize: 26, margin: '6px 0 4px' }}>{nombreDe(p)}</h2>
        <span className={'pill-st ' + (ESTADOS_PEDIDO[p.estado]?.clase || '')}>{ESTADOS_PEDIDO[p.estado]?.label || p.estado}</span>
        <div className="order-b" style={{ padding: 0, border: 0 }}>
          <div className="lines">
            {(p.pedido_items || []).map((i, k) => (
              <div key={k} className="sum" style={{ fontSize: 14 }}><span>{i.cantidad}× {i.variante?.tono?.nombre || i.variante?.producto?.nombre}<span className="mono mute" style={{ display: 'block', fontSize: 12.5 }}>{i.variante?.sku}</span></span><span className="mono">{mxn(i.precio_unitario * i.cantidad)}</span></div>
            ))}
            <div className="sum" style={{ fontSize: 14 }}><span>Envío</span><span className="mono">{Number(p.envio) ? mxn(p.envio) : 'Gratis'}</span></div>
            <div className="sum t"><span>Total</span><span className="mono">{mxn(p.total)}</span></div>
          </div>
          {tel && <a className="btn ghost" href={waTo(tel, `Hola ${nombreDe(p).split(' ')[0]}, te escribimos de Pupilentes AGO por tu pedido ${p.folio}.`)} target="_blank" rel="noreferrer">Escribir por WhatsApp</a>}
          <p className="mute" style={{ fontSize: 12.5, marginTop: 12 }}>Validar pagos y generar guías se activan en las Fases 3 y 4.</p>
        </div>
      </div>
    </div>
  );
}
