import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ArrowLeft, ArrowRight, Check, Lock, CreditCard, Landmark, ShieldCheck } from 'lucide-react';
import { useStore } from '../lib/store';
import { mxn } from '../lib/catalog';
import { useProductos } from '../lib/tienda';
import { cargarEntregas, cotizarEnvio, crearPedido } from '../lib/pedidos';
import { Turnstile } from '../lib/Turnstile';
import { useCuenta, iniciarCuenta, maxPuntos, descuentoDe, derivados } from '../lib/cuenta';
import { LOGO, TLink, Iris } from '../ui';

// Caja real (Fase 3): compra como invitada (D5), Mercado Pago con tarjeta o SPEI (D2) o transferencia
// con apartado de 24 h (D3). El total lo calcula el servidor; aquí solo se muestra.
// Fase 7: con la cuenta abierta el pedido queda en su historial y puede usar puntos (los valida el servidor).

const HORAS = ['12:00', '15:30', '18:00'];
const ETAPAS = ['Tus datos', 'Entrega', 'Pago'];
const ESTACIONES = ['Pantitlán', 'Tepalcates'];
function dias() { const out = []; const d = new Date(); for (let i = 1; out.length < 5; i++) { const x = new Date(d); x.setDate(d.getDate() + i); if (x.getDay() !== 0) out.push(x); } return out; }
const fmtDia = (d) => d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' });
const TIPOS = [
  { id: 'metro', nombre: 'Entrega en Metro', detalle: 'Pantitlán o Tepalcates, con cita', icon: 'M' },
  { id: 'metro_otra', nombre: 'Otra estación de Metro', detalle: 'Costo extra por traslado', icon: 'M+' },
  { id: 'didi', nombre: 'Envío por DiDi', detalle: 'Mismo día en CDMX y zona oriente', icon: 'D' },
  { id: 'paqueteria', nombre: 'Paquetería a todo México', detalle: 'Guía con rastreo · se cotiza con tu código postal', icon: 'P', cotiza: true },
];
const nuevaClave = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}-pedido`);
const VACIA = { calle: '', numero: '', colonia: '', ciudad: '', estado: '', cp: '', referencias: '' };

export default function Checkout() {
  const { bolsa, vaciar } = useStore();
  const productos = useProductos();
  const nav = useNavigate();
  const root = useRef();
  const ts = useRef();
  const [paso, setPaso] = useState(0);
  const [contacto, setContacto] = useState({ nombre: '', telefono: '', correo: '' });
  const [tarifas, setTarifas] = useState(null);
  const [tipo, setTipo] = useState('metro');
  const [zona, setZona] = useState({ metro: 'Pantitlán', metro_otra: 'Otra estación', didi: 'Iztacalco' });
  const [cita, setCita] = useState({ dia: 0, hora: '15:30', estacion: '' });
  const [dir, setDir] = useState(VACIA);
  const [metodo, setMetodo] = useState('mercadopago');
  const [token, setToken] = useState(null);
  // Paquetería (Fase 4): opciones cotizadas por el servidor con Envia.com
  const tsEnvio = useRef();
  const [tokenEnvio, setTokenEnvio] = useState(null);
  const [opciones, setOpciones] = useState(null);
  const [opcion, setOpcion] = useState(null);
  const [cotizando, setCotizando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [totalServidor, setTotalServidor] = useState(null);   // si el servidor dice que el total cambió
  const clave = useRef(nuevaClave());
  const ds = useMemo(dias, []);
  // Cuenta (Fase 7)
  const cuenta = useCuenta();
  const conCuenta = cuenta.estado === 'dentro' && !!cuenta.datos;
  const [usarPuntos, setUsarPuntos] = useState(false);
  useEffect(() => { iniciarCuenta(); }, []);
  useEffect(() => {
    const p = cuenta.datos?.perfil; if (!p) return;
    setContacto((c) => ({ nombre: c.nombre || p.nombre || '', telefono: c.telefono || p.telefono || '', correo: c.correo || p.correo || '' }));
  }, [cuenta.datos]);

  useGSAP(() => { gsap.from('.co-step > *', { y: 30, opacity: 0, stagger: 0.05, duration: 0.8, ease: 'expo.out', clearProps: 'transform' }); }, { scope: root, dependencies: [paso] });
  useEffect(() => { cargarEntregas().then(setTarifas).catch(() => setTarifas([])); }, []);
  // Cambió algo del pedido → es un pedido distinto (otra clave) y el aviso de total ya no aplica
  useEffect(() => { clave.current = nuevaClave(); setTotalServidor(null); }, [tipo, zona, metodo, bolsa, opcion, usarPuntos, conCuenta]);
  // La cotización vale para ese CP y esas piezas: si cambian, hay que volver a cotizar
  useEffect(() => { setOpciones(null); setOpcion(null); }, [dir.cp, bolsa]);

  const items = useMemo(() => {
    const m = new Map();
    for (const b of bolsa) if (b.sku) m.set(b.sku, (m.get(b.sku) ?? 0) + b.cant);
    return [...m].map(([sku, cantidad]) => ({ sku, cantidad }));
  }, [bolsa]);
  const sinSku = bolsa.some((b) => !b.sku);

  if (!bolsa.length) return <main className="co"><div className="wrap empty"><p className="h-m" style={{ marginBottom: 16 }}>Tu bolsa está vacía</p><TLink className="btn" to="/tienda">Ir a la tienda</TLink></div></main>;

  const tarifa = tipo === 'paqueteria'
    ? (opcion ? { tipo, zona: 'Paquetería', costo: opcion.precio, detalle: opcion.entrega ? `Entrega estimada: ${opcion.entrega}` : null } : null)
    : tarifas?.find((t) => t.tipo === tipo && t.zona === zona[tipo]);
  const zonasDe = (t) => (tarifas ?? []).filter((x) => x.tipo === t);
  const sub = bolsa.reduce((a, b) => a + b.precio * b.cant, 0);
  const envio = tarifa?.costo ?? null;
  const reglas = cuenta.datos?.reglas;
  const ptsMax = conCuenta ? maxPuntos(sub, cuenta.datos.saldo, reglas) : 0;
  const puntos = usarPuntos && ptsMax > 0 ? ptsMax : 0;
  const descuento = descuentoDe(puntos, reglas);
  const total = totalServidor ?? Math.round((sub + (envio ?? 0) - descuento) * 100) / 100;
  const guardadas = conCuenta ? derivados(cuenta.datos.pedidos).direcciones : [];
  const necesitaDir = tipo === 'didi';   // paquetería tiene su propio formulario (Fase 4)
  const telOk = contacto.telefono.replace(/\D/g, '').length === 10;
  const correoOk = !contacto.correo || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contacto.correo);
  const datosOk = contacto.nombre.trim().length >= 2 && telOk && correoOk;
  const dirPaqOk = dir.calle.trim().length >= 3 && dir.colonia.trim().length >= 2 && dir.ciudad.trim().length >= 2 && dir.estado.trim().length >= 2 && /^\d{5}$/.test(dir.cp);
  const entregaOk = tarifa && (tipo !== 'metro_otra' || cita.estacion.trim()) &&
    (tipo === 'paqueteria' ? dirPaqOk && !!opcion : !necesitaDir || (dir.calle.trim() && dir.colonia.trim()));

  const cotizar = async () => {
    if (!tokenEnvio || cotizando || !dirPaqOk) return;
    setCotizando(true); setErrorEnvio(''); setOpcion(null);
    try {
      const r = await cotizarEnvio(items, { cp: dir.cp, ciudad: dir.ciudad.trim(), estado: dir.estado.trim(), colonia: dir.colonia.trim() }, tokenEnvio);
      setOpciones(r.opciones || []);
      if (!r.opciones?.length) setErrorEnvio('No hay paqueterías disponibles para ese código postal.');
    } catch (e) {
      setOpciones(null); setErrorEnvio(e.message || 'No pudimos cotizar el envío. Inténtalo de nuevo.');
    } finally {
      setCotizando(false); tsEnvio.current?.reiniciar();   // cada token sirve una vez
    }
  };

  const entrega = () => {
    if (tipo === 'paqueteria') {
      const d = { calle: dir.calle.trim(), colonia: dir.colonia.trim(), ciudad: dir.ciudad.trim(), estado: dir.estado.trim(), cp: dir.cp };
      if (dir.numero.trim()) d.numero = dir.numero.trim().slice(0, 20);
      const e = { tipo, zona: 'Paquetería', cotizacion: opcion.id, direccion_envio: d,
        direccion: [`${d.calle}${d.numero ? ' ' + d.numero : ''}`, d.colonia, d.ciudad, d.estado, `CP ${d.cp}`].join(', ').slice(0, 300) };
      if (dir.referencias.trim()) e.referencias = dir.referencias.trim().slice(0, 200);
      return e;
    }
    const e = { tipo, zona: zona[tipo] };
    if (tipo === 'metro') e.cita = `Metro ${zona.metro} · ${fmtDia(ds[cita.dia])} · ${cita.hora}`;
    if (tipo === 'metro_otra') e.cita = `Metro ${cita.estacion.trim()} · ${fmtDia(ds[cita.dia])} · ${cita.hora}`;
    if (necesitaDir) {
      e.direccion = [`${dir.calle.trim()}${dir.numero.trim() ? ' ' + dir.numero.trim() : ''}`, dir.colonia, zona.didi].map((x) => x.trim()).filter(Boolean).join(', ').slice(0, 300);
      if (dir.referencias.trim()) e.referencias = dir.referencias.trim().slice(0, 200);
    }
    return e;
  };

  const pagar = async () => {
    if (!token || enviando) return;
    setEnviando(true); setError('');
    try {
      const r = await crearPedido({
        clave_idempotencia: clave.current, metodo_pago: metodo, items, entrega: entrega(),
        contacto: { nombre: contacto.nombre.trim(), telefono: contacto.telefono.replace(/\D/g, ''), correo: contacto.correo.trim() },
        puntos, total_visto: total, turnstile: token,
      });
      if (conCuenta) cuenta.refrescar();
      vaciar();
      if (r.url_pago) { window.location.assign(r.url_pago); return; }
      nav(`/pedido/${r.token}?nuevo=1`, { replace: true });
    } catch (e) {
      if (e.codigo === 'total_cambio' && Number.isFinite(e.datos?.total)) {
        setTotalServidor(e.datos.total);
        setError(`El total cambió a ${mxn(e.datos.total)} (precio o envío actualizados). Revísalo y vuelve a confirmar.`);
      } else if (['puntos_insuficientes', 'puntos_excedidos', 'puntos_inactivos'].includes(e.codigo)) {
        setUsarPuntos(false); cuenta.refrescar();
        setError(`${e.message} Quitamos los puntos; revisa el total y vuelve a confirmar.`);
      } else if (e.codigo === 'sesion_vencida' || e.codigo === 'puntos_sin_cuenta') {
        setUsarPuntos(false); cuenta.salir();
        setError(e.message || 'Tu sesión venció. Puedes comprar como invitada o volver a entrar a tu cuenta.');
      } else if (['cotizacion_vencida', 'cotizacion_no_coincide'].includes(e.codigo)) {
        setOpciones(null); setOpcion(null); setPaso(1);
        setErrorEnvio(e.message);
      } else {
        setError(e.message || 'No pudimos crear tu pedido. Inténtalo de nuevo.');
        if (e.estado === 502 || e.estado === 0) clave.current = nuevaClave();   // MP no respondió: el pedido se canceló
      }
      ts.current?.reiniciar();   // cada token de Turnstile sirve una sola vez
    } finally {
      setEnviando(false);
    }
  };

  const sc = (k) => (e) => setContacto({ ...contacto, [k]: e.target.value });
  const sd = (k) => (e) => setDir({ ...dir, [k]: k === 'cp' ? e.target.value.replace(/\D/g, '').slice(0, 5) : e.target.value });

  return (
    <div className="cx" ref={root}>
      <header className="cx-top"><div className="wrap">
        <TLink to="/" className="brand"><img src={LOGO} alt="" />PUPILENTES AGO</TLink>
        <ol className="cx-steps">{ETAPAS.map((e, i) => <li key={e} className={i < paso ? 'done' : i === paso ? 'on' : ''}><span>{i < paso ? <Check size={12} /> : i + 1}</span>{e}</li>)}</ol>
        <span className="cx-lock"><Lock size={14} /> Caja segura</span>
      </div></header>
      <main className="co"><div className="wrap grid">
        <div>
          <button className="mute" style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 14 }} onClick={() => (paso ? setPaso(paso - 1) : nav('/tienda'))}><ArrowLeft size={16} /> {paso ? 'Atrás' : 'Seguir comprando'}</button>

          {paso === 0 && (<form className="co-step" onSubmit={(e) => { e.preventDefault(); if (datosOk) setPaso(1); }}>
            <h1 className="h-l" style={{ margin: '26px 0 12px' }}>¿A quién le <span className="it gold">entregamos?</span></h1>
            {conCuenta
              ? <p className="lead">Compras con tu cuenta <b>{cuenta.correo}</b>: este pedido suma puntos. Con tu WhatsApp te confirmamos la entrega.</p>
              : <p className="lead">No necesitas cuenta. Con tu WhatsApp te confirmamos la entrega. <TLink to="/cuenta" className="link">¿Tienes cuenta? Entra</TLink> para sumar y usar puntos.</p>}
            <div className="field"><label htmlFor="co-nombre">Nombre completo</label><input id="co-nombre" className="inp" autoComplete="name" required maxLength={120} value={contacto.nombre} onChange={sc('nombre')} /></div>
            <div className="field"><label htmlFor="co-tel">WhatsApp (10 dígitos)</label>
              <div className="cx-tel" style={{ marginTop: 0 }}><span className="mono">+52</span><input id="co-tel" className="mono" inputMode="tel" autoComplete="tel-national" required value={contacto.telefono} onChange={(e) => setContacto({ ...contacto, telefono: e.target.value.replace(/[^\d ]/g, '').slice(0, 14) })} placeholder="55 1234 5678" /></div>
              {contacto.telefono && !telOk && <p className="err">Escribe los 10 dígitos de tu número.</p>}
            </div>
            <div className="field"><label htmlFor="co-correo">Correo <span className="mute">(opcional, para tu recibo)</span></label><input id="co-correo" className="inp" type="email" autoComplete="email" maxLength={254} value={contacto.correo} onChange={sc('correo')} />
              {!correoOk && <p className="err">Revisa tu correo.</p>}</div>
            <button className="btn full" style={{ marginTop: 22, height: 58 }} disabled={!datosOk}>Continuar <ArrowRight size={18} /></button>
          </form>)}

          {paso === 1 && (<div className="co-step">
            <h1 className="h-l" style={{ margin: '26px 0 24px' }}>¿Cómo lo quieres <span className="it gold">recibir?</span></h1>
            {!tarifas && <p className="mute" role="status">Cargando opciones de entrega…</p>}
            {tarifas?.length === 0 && <p className="err" role="alert">No pudimos cargar las opciones de entrega. Recarga la página.</p>}
            {tarifas && TIPOS.filter((t) => t.cotiza || zonasDe(t.id).length).map((t) => {
              const costos = zonasDe(t.id).map((x) => x.costo);
              const min = Math.min(...costos), max = Math.max(...costos);
              return (
                <button key={t.id} className={'opt ' + (tipo === t.id ? 'on' : '')} onClick={() => setTipo(t.id)}>
                  <span className="ic">{t.icon}</span><span className="t"><b>{t.nombre}</b><small>{t.detalle}</small></span>
                  <span className="c">{t.cotiza ? (opcion ? `+${mxn(opcion.precio)}` : 'Cotizar') : max === 0 ? 'Gratis' : min === max ? `+${mxn(min)}` : `desde ${mxn(min)}`}</span>
                </button>);
            })}
            {tipo === 'paqueteria' && <div className="box" style={{ marginTop: 18 }}>
              {guardadas.length > 0 && <div className="frow" style={{ marginBottom: 12 }}>{guardadas.map((d, i) => (
                <button key={i} className="chip" onClick={() => setDir({ ...VACIA, ...d, numero: d.numero || '' })}>Usar {d.calle}{d.numero ? ` ${d.numero}` : ''} · CP {d.cp}</button>))}</div>}
              <div className="field" style={{ marginTop: 0 }}><label htmlFor="co-calle">Calle</label><input id="co-calle" className="inp" maxLength={120} autoComplete="address-line1" value={dir.calle} onChange={sd('calle')} /></div>
              <div className="two"><div className="field"><label htmlFor="co-num">Número <span className="mute">(ext. e int.)</span></label><input id="co-num" className="inp" maxLength={20} value={dir.numero} onChange={sd('numero')} /></div>
                <div className="field"><label htmlFor="co-col">Colonia</label><input id="co-col" className="inp" maxLength={80} value={dir.colonia} onChange={sd('colonia')} /></div></div>
              <div className="two"><div className="field"><label htmlFor="co-cp">Código postal</label><input id="co-cp" className="inp mono" inputMode="numeric" autoComplete="postal-code" value={dir.cp} onChange={sd('cp')} /></div>
                <div className="field"><label htmlFor="co-ciu">Ciudad o municipio</label><input id="co-ciu" className="inp" maxLength={60} autoComplete="address-level2" value={dir.ciudad} onChange={sd('ciudad')} /></div></div>
              <div className="field"><label htmlFor="co-edo">Estado</label><input id="co-edo" className="inp" maxLength={40} autoComplete="address-level1" value={dir.estado} onChange={sd('estado')} /></div>
              <div className="field"><label htmlFor="co-ref">Referencias <span className="mute">(opcional)</span></label><input id="co-ref" className="inp" maxLength={200} value={dir.referencias} onChange={sd('referencias')} placeholder="Portón negro, entre calles…" /></div>
              {!opciones && <>
                <div style={{ marginTop: 14 }}><Turnstile ref={tsEnvio} accion="cotizar" alCambiar={setTokenEnvio} /></div>
                <button className="btn full" style={{ marginTop: 12 }} disabled={!dirPaqOk || !tokenEnvio || cotizando} onClick={cotizar}>{cotizando ? 'Cotizando…' : 'Ver opciones de envío'}</button>
              </>}
              {opciones?.length > 0 && <div className="field"><label>Elige la paquetería</label>
                {opciones.map((o) => (
                  <button key={o.id} className={'opt ' + (opcion?.id === o.id ? 'on' : '')} onClick={() => setOpcion(o)}>
                    <span className="t"><b style={{ textTransform: 'capitalize' }}>{o.carrier} · {o.descripcion || o.servicio}</b><small>{o.entrega || 'Entrega según la paquetería'}</small></span>
                    <span className="c">{mxn(o.precio)}</span>
                  </button>))}
                <button className="mute" style={{ fontSize: 13, marginTop: 6 }} onClick={() => { setOpciones(null); setOpcion(null); }}>Cambiar dirección o volver a cotizar</button>
              </div>}
              {errorEnvio && <p className="err" role="alert">{errorEnvio}</p>}
            </div>}
            {tarifa && tipo !== 'paqueteria' && <div className="box" style={{ marginTop: 18 }}>
              {(tipo === 'metro' || tipo === 'metro_otra') && (<>
                {tipo === 'metro'
                  ? <div className="seg">{zonasDe('metro').map((s) => <button key={s.zona} className={zona.metro === s.zona ? 'on' : ''} onClick={() => setZona({ ...zona, metro: s.zona })}>Metro {s.zona}</button>)}</div>
                  : <div className="field" style={{ marginTop: 0 }}><label htmlFor="co-est">¿Qué estación?</label><input id="co-est" className="inp" maxLength={60} value={cita.estacion} onChange={(e) => setCita({ ...cita, estacion: e.target.value })} placeholder="Ej. Zaragoza" /></div>}
                <div className="field"><label>Día</label><div className="frow">{ds.map((x, i) => <button key={i} className={'chip ' + (cita.dia === i ? 'on' : '')} onClick={() => setCita({ ...cita, dia: i })}>{fmtDia(x)}</button>)}</div></div>
                <div className="field"><label>Hora</label><div className="frow">{HORAS.map((h) => <button key={h} className={'chip mono ' + (cita.hora === h ? 'on' : '')} onClick={() => setCita({ ...cita, hora: h })}>{h}</button>)}</div></div>
                <p className="note">Te confirmamos la cita por WhatsApp.</p>
              </>)}
              {tipo === 'didi' && (<>
                <div className="field" style={{ marginTop: 0 }}><label htmlFor="co-alc">Alcaldía o municipio</label>
                  <select id="co-alc" className="inp" value={zona.didi} onChange={(e) => setZona({ ...zona, didi: e.target.value })}>{zonasDe('didi').map((a) => <option key={a.zona} value={a.zona}>{a.zona} · {mxn(a.costo)}</option>)}</select></div>
              </>)}
              {tarifa.detalle && <p className="note">{tarifa.detalle}</p>}
              {necesitaDir && (<>
                <div className="field"><label htmlFor="co-calle">Calle y número</label><input id="co-calle" className="inp" maxLength={120} autoComplete="address-line1" value={dir.calle} onChange={sd('calle')} /></div>
                <div className="two"><div className="field"><label htmlFor="co-col">Colonia</label><input id="co-col" className="inp" maxLength={80} value={dir.colonia} onChange={sd('colonia')} /></div>
                </div>
                <div className="field"><label htmlFor="co-ref">Referencias <span className="mute">(opcional)</span></label><input id="co-ref" className="inp" maxLength={200} value={dir.referencias} onChange={sd('referencias')} placeholder="Portón negro, entre calles…" /></div>
              </>)}
            </div>}
            <button className="btn full" style={{ marginTop: 20, height: 58 }} disabled={!entregaOk} onClick={() => setPaso(2)}>Ir al pago <ArrowRight size={18} /></button>
          </div>)}

          {paso === 2 && (<div className="co-step">
            <h1 className="h-l" style={{ margin: '26px 0 22px' }}>¿Cómo quieres <span className="it gold">pagar?</span></h1>
            <button className={'opt ' + (metodo === 'mercadopago' ? 'on' : '')} onClick={() => setMetodo('mercadopago')}>
              <span className="ic"><CreditCard size={18} /></span><span className="t"><b>Tarjeta o SPEI con Mercado Pago</b><small>Pagas en la página segura de Mercado Pago. Apartamos tus piezas mientras pagas.</small></span></button>
            <button className={'opt ' + (metodo === 'transferencia' ? 'on' : '')} onClick={() => setMetodo('transferencia')}>
              <span className="ic"><Landmark size={18} /></span><span className="t"><b>Transferencia directa</b><small>Te damos la CLABE y apartamos tus piezas 24 horas mientras validamos tu pago.</small></span></button>
            {conCuenta && ptsMax > 0 && <label className={'opt ' + (usarPuntos ? 'on' : '')} style={{ cursor: 'pointer' }}>
              <span className="ic"><input type="checkbox" checked={usarPuntos} onChange={(e) => setUsarPuntos(e.target.checked)} aria-label="Usar mis puntos" /></span>
              <span className="t"><b>Usar {ptsMax} de mis {cuenta.datos.saldo} puntos</b><small>Descuento de {mxn(descuentoDe(ptsMax, reglas))} sobre tus productos (hasta el {reglas.max_pct}%).</small></span></label>}
            {sinSku && <p className="err" role="alert">Uno de los artículos de tu bolsa es de una versión anterior de la tienda. Quítalo y vuelve a agregarlo.</p>}
            <div style={{ marginTop: 22 }}><Turnstile ref={ts} accion="pedido" alCambiar={setToken} /></div>
            {error && <p className="err" role="alert">{error}</p>}
            <button className="btn full gold" style={{ marginTop: 16, height: 60 }} disabled={!token || enviando || sinSku || !items.length} onClick={pagar}>
              {enviando ? 'Un momento…' : metodo === 'mercadopago' ? <>Pagar {mxn(total)} con Mercado Pago</> : <>Apartar y ver datos de transferencia</>}
            </button>
            <p className="mute" style={{ fontSize: 13, marginTop: 10, display: 'flex', gap: 6, alignItems: 'flex-start' }}><ShieldCheck size={15} style={{ flex: 'none', marginTop: 2 }} />
              {metodo === 'mercadopago' ? 'No guardamos los datos de tu tarjeta: los recibe directamente Mercado Pago.' : 'Si no recibimos tu pago en 24 horas, el apartado se libera solo.'}</p>
          </div>)}
        </div>

        <aside className="aside box cx-sum">
          <p className="eyebrow" style={{ marginBottom: 12 }}>Tu pedido</p>
          {bolsa.map((b, i) => { const p = productos.find((x) => x.id === b.id); return (
            <div key={i} className="cx-it">{p?.tipo === 'lente' ? <Iris p={p} size={48} glint={false} /> : <span className="iris" style={{ width: 48, background: 'var(--sand)' }} />}
              <span style={{ flex: 1 }}><b>{b.cant}× {b.nombre}</b>{(b.graduacion ?? b.od) !== '0.00' && <span className="mono mute" style={{ display: 'block', fontSize: 12 }}>Graduación {b.graduacion ?? b.od} · el par</span>}</span><span className="mono">{mxn(b.precio * b.cant)}</span></div>); })}
          <div style={{ borderTop: '1px solid var(--line)', margin: '12px 0' }} />
          <div className="sum"><span>Subtotal</span><span className="mono">{mxn(sub)}</span></div>
          <div className="sum"><span>Envío</span><span className="mono">{paso < 1 || envio === null ? '—' : envio === 0 ? 'Gratis' : mxn(envio)}</span></div>
          {descuento > 0 && <div className="sum"><span>Puntos ({puntos})</span><span className="mono">−{mxn(descuento)}</span></div>}
          <div className="sum t"><span>Total</span><span className="mono">{mxn(total)}</span></div>
          {totalServidor !== null && <p className="note" style={{ marginTop: 8 }}>Total actualizado por la tienda.</p>}
        </aside>
      </div></main>
    </div>
  );
}
