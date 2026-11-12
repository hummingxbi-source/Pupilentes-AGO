import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import gsap from 'gsap';
import { MessageCircle, Upload, Copy, Check } from 'lucide-react';
import { mxn } from '../lib/catalog';
import { useProductos } from '../lib/tienda';
import { ESTADO_CLIENTA, PASOS_CLIENTA, avisarPorWhatsapp, esToken, rastrearPorFolio, rastrearPorToken, subirComprobante } from '../lib/pedidos';
import { Turnstile } from '../lib/Turnstile';
import { Iris } from '../ui';

// Seguimiento del pedido (§3.3 F). Con el enlace secreto (/pedido/<token>) o con folio + últimos 4 del teléfono.
export default function Pedido() {
  const { clave } = useParams();
  const [qs] = useSearchParams();
  const [p, setP] = useState(null);
  const [error, setError] = useState('');
  const nuevo = qs.get('nuevo');
  const deMP = qs.has('payment_id') || qs.has('status');

  const cargar = useCallback(async () => {
    try { setP(await rastrearPorToken(clave)); setError(''); } catch (e) { setError(e.estado === 404 ? 'No encontramos ese pedido.' : 'No pudimos cargar tu pedido. Revisa tu conexión.'); }
  }, [clave]);

  useEffect(() => { if (esToken(clave)) cargar(); }, [clave]);
  // De regreso de Mercado Pago el aviso del pago puede tardar unos segundos: se consulta de nuevo un rato.
  useEffect(() => {
    if (!p || !deMP || p.estado !== 'pendiente_pago') return undefined;
    let n = 0;
    const t = setInterval(() => { n += 1; if (n > 24) clearInterval(t); else cargar(); }, 5000);
    return () => clearInterval(t);
  }, [p?.estado, deMP]);

  if (!esToken(clave)) return <Buscar folioInicial={clave} />;
  if (error) return <main className="co"><div className="wrap done"><p className="h-m">{error}</p></div></main>;
  if (!p) return <main className="co"><div className="wrap done"><p className="mute" role="status">Cargando tu pedido…</p></div></main>;
  return <Detalle p={p} token={clave} nuevo={nuevo} deMP={deMP} recargar={cargar} estadoMP={qs.get('status')} />;
}

function Detalle({ p, token, nuevo, deMP, recargar, estadoMP }) {
  const productos = useProductos();
  const ref = useRef();
  const est = ESTADO_CLIENTA[p.estado] ?? { titulo: p.estado };
  const lente = productos.find((x) => p.items.some((i) => i.clave === x.id) && x.tipo === 'lente');
  const pagado = !est.fin && est.paso >= 1;

  useEffect(() => {
    if (!ref.current) return;
    gsap.from(ref.current.children, { y: 30, opacity: 0, stagger: 0.07, duration: 0.9, ease: 'expo.out', clearProps: 'transform' });
  }, []);
  useEffect(() => {
    if (pagado && (nuevo || deMP)) import('canvas-confetti').then(({ default: c }) => c({ particleCount: 70, spread: 70, origin: { y: 0.35 }, colors: ['#A3824C', '#D9C7A3', '#141210', '#FBFAF7'] }));
  }, [pagado]);

  const titulo = p.estado === 'pendiente_pago' && p.metodo_pago === 'mercadopago' && deMP
    ? (estadoMP === 'rejected' ? 'Mercado Pago rechazó el pago' : 'Confirmando tu pago…')
    : p.estado === 'pendiente_pago' && p.metodo_pago === 'transferencia' ? <>¡Listo, {p.nombre}! <span className="it gold">Tus piezas están apartadas.</span></>
    : est.titulo;

  return (
    <main className="co"><div className="wrap done" ref={ref}>
      {lente ? <Iris p={lente} /> : <Iris fam="cafe" />}
      <p className="eyebrow">Pedido {p.folio}</p>
      <h1 className="h-m" style={{ margin: '10px 0 10px' }}>{titulo}</h1>
      <p className="mute">{explicacion(p, estadoMP, deMP)}</p>

      {p.transferencia && <Transferencia p={p} token={token} recargar={recargar} />}

      {!est.fin && <div className="timeline">
        {PASOS_CLIENTA.map((s, i) => (
          <div key={s} className={'tl ' + (i <= est.paso ? 'on' : '')}><i>{i < est.paso ? '✓' : i + 1}</i><div><b>{s}</b>{i === est.paso && <small>{est.titulo}</small>}</div></div>
        ))}
      </div>}

      <div className="bank" style={{ textAlign: 'left', margin: '18px 0' }}>
        {p.items.map((i) => <div key={i.sku}>{i.cantidad}× {i.nombre}{i.graduacion && Number(i.graduacion) !== 0 ? ` · ${Number(i.graduacion).toFixed(2)}` : ''} <b>{mxn(i.precio * i.cantidad)}</b></div>)}
        <div>Entrega <b>{p.entrega?.cita || p.entrega?.zona}</b></div>
        <div>Envío <b>{Number(p.envio) === 0 ? 'Gratis' : mxn(p.envio)}</b></div>
        <div>Total <b style={{ fontSize: 20 }}>{mxn(p.total)}</b></div>
        {p.envio_info?.guia && <div>Guía {p.envio_info.proveedor} <b>{p.envio_info.url_rastreo ? <a href={p.envio_info.url_rastreo} target="_blank" rel="noreferrer">{p.envio_info.guia}</a> : p.envio_info.guia}</b></div>}
      </div>
      <GuardarEnlace />
      <p className="mute" style={{ fontSize: 13, marginTop: 14 }}>¿Dudas? <a className="link" href={`https://wa.me/52${p.whatsapp}?text=${encodeURIComponent(`Hola, tengo una duda de mi pedido ${p.folio}`)}`} target="_blank" rel="noreferrer">Escríbenos por WhatsApp</a></p>
    </div></main>
  );
}

function explicacion(p, estadoMP, deMP) {
  const vence = p.expira_reserva_en ? new Date(p.expira_reserva_en).toLocaleString('es-MX', { weekday: 'long', hour: 'numeric', minute: '2-digit' }) : null;
  switch (p.estado) {
    case 'pendiente_pago':
      if (p.metodo_pago === 'transferencia') return `Transfiere el monto exacto antes del ${vence ?? 'plazo'} y avísanos con tu comprobante.`;
      if (deMP && estadoMP === 'rejected') return `Puedes volver a intentarlo con otra tarjeta desde la tienda. Tus piezas siguen apartadas hasta el ${vence ?? 'plazo'}.`;
      if (deMP) return 'En cuanto Mercado Pago nos confirme, esta página se actualiza sola.';
      return `Tus piezas están apartadas hasta el ${vence ?? 'plazo'}. Si cerraste Mercado Pago sin pagar, el apartado se libera solo.`;
    case 'pendiente_validacion': return 'Recibimos tu aviso. Validamos tu transferencia y te confirmamos por WhatsApp.';
    case 'pagado': return p.entrega?.tipo?.startsWith('metro') ? `Te vemos en ${p.entrega.cita ?? 'la cita que acordemos'}.` : 'Preparamos tu pedido y te avisamos cuando salga.';
    case 'preparando': return 'Estamos preparando tus pupilentes.';
    case 'enviado': return 'Tu pedido va en camino.';
    case 'entregado': return '¡Disfrútalos!';
    case 'expirado': return 'No recibimos el pago a tiempo y las piezas volvieron a la tienda. Puedes hacer un pedido nuevo.';
    case 'cancelado': return 'Este pedido se canceló. Si tienes dudas, escríbenos.';
    case 'pagado_sin_stock': return 'Alguien más se llevó la última pieza mientras se acreditaba tu pago. Te escribimos para devolverte tu dinero o cambiarlo por otro tono.';
    case 'reembolsado': return 'El reembolso puede tardar unos días en verse en tu cuenta, según tu banco.';
    default: return '';
  }
}

function Transferencia({ p, token, recargar }) {
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState('');
  const t = p.transferencia;
  const yaAviso = p.estado === 'pendiente_validacion';
  const porWhatsapp = async () => {
    const msg = `Hola, hice mi pedido ${p.folio} por ${mxn(p.total)} y ya transferí. Te mando mi comprobante 👇`;
    window.open(`https://wa.me/52${p.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
    try { await avisarPorWhatsapp(token); recargar(); } catch { /* el WhatsApp ya se abrió; la dueña lo valida igual */ }
  };
  const subir = async (archivo) => {
    setEnviando(true); setAviso('');
    try { await subirComprobante(token, archivo); setAviso('¡Recibido! Lo revisamos y te confirmamos.'); recargar(); }
    catch (e) { setAviso(e.estado === 503 ? 'Por ahora manda tu comprobante por WhatsApp.' : e.message); }
    finally { setEnviando(false); }
  };
  return (<>
    <div className="bank" style={{ textAlign: 'left', marginTop: 22 }}>
      <div>Banco <b>{t.banco}</b></div>
      <div>CLABE <b>{t.clabe.replace(/(\d{4})(?=\d)/g, '$1 ')}</b> <CopiarBoton texto={t.clabe} /></div>
      <div>Beneficiario <b>{t.beneficiario}</b></div>
      <div>Concepto <b>{p.folio}</b></div>
      <div>Monto exacto <b style={{ fontSize: 22 }}>{mxn(p.total)}</b></div>
    </div>
    {!yaAviso && token && <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
      <button className="btn" style={{ whiteSpace: 'normal', height: 'auto', minHeight: 52, padding: '12px 20px' }} onClick={porWhatsapp}><MessageCircle size={18} style={{ flex: 'none' }} /> Ya transferí: mandar comprobante por WhatsApp</button>
      <label className="upload" style={{ marginTop: 0 }} aria-busy={enviando}>
        <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" hidden disabled={enviando} onChange={(e) => { const f = e.target.files?.[0]; if (f) subir(f); e.target.value = ''; }} />
        <Upload size={20} /> {enviando ? 'Subiendo…' : 'O súbelo aquí (foto o PDF, hasta 5 MB)'}
      </label>
    </div>}
    {aviso && <p className="note" role="status">{aviso}</p>}
  </>);
}

function CopiarBoton({ texto }) {
  const [ok, setOk] = useState(false);
  return <button style={{ color: 'inherit', marginLeft: 6, verticalAlign: 'middle' }} aria-label="Copiar CLABE" onClick={() => navigator.clipboard?.writeText(texto).then(() => { setOk(true); setTimeout(() => setOk(false), 1500); })}>{ok ? <Check size={14} /> : <Copy size={14} />}</button>;
}

function GuardarEnlace() {
  const [ok, setOk] = useState(false);
  const url = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';
  return <button className="btn ghost sm" onClick={() => navigator.clipboard?.writeText(url).then(() => { setOk(true); setTimeout(() => setOk(false), 1800); })}>{ok ? <><Check size={15} /> Enlace copiado</> : <><Copy size={15} /> Copiar el enlace de este pedido</>}</button>;
}

function Buscar({ folioInicial }) {
  const nav = useNavigate();
  const ts = useRef();
  const [folio, setFolio] = useState((folioInicial || '').toUpperCase());
  const [tel4, setTel4] = useState('');
  const [token, setToken] = useState(null);
  const [p, setP] = useState(null);
  const [error, setError] = useState('');
  const [buscando, setBuscando] = useState(false);
  const buscar = async (e) => {
    e.preventDefault(); setBuscando(true); setError('');
    try { setP(await rastrearPorFolio(folio.trim(), tel4, token)); }
    catch (er) { setError(er.message || 'No pudimos buscar tu pedido.'); ts.current?.reiniciar(); }
    finally { setBuscando(false); }
  };
  if (p) return <Detalle p={p} token={null} recargar={() => {}} />;
  return (
    <main className="co"><div className="wrap done">
      <p className="eyebrow">Rastrear pedido</p>
      <h1 className="h-m" style={{ margin: '10px 0 10px' }}>¿Cómo va mi pedido?</h1>
      <p className="mute" style={{ marginBottom: 18 }}>Usa el enlace que te dimos al comprar, o escribe tu folio y los últimos 4 dígitos de tu WhatsApp.</p>
      <form onSubmit={buscar} style={{ textAlign: 'left', maxWidth: 380, margin: '0 auto' }}>
        <div className="field"><label htmlFor="r-folio">Folio</label><input id="r-folio" className="inp mono" required value={folio} onChange={(e) => setFolio(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 20))} placeholder="AGO-1001" /></div>
        <div className="field"><label htmlFor="r-tel">Últimos 4 dígitos de tu WhatsApp</label><input id="r-tel" className="inp mono" inputMode="numeric" required pattern="[0-9]{4}" value={tel4} onChange={(e) => setTel4(e.target.value.replace(/\D/g, '').slice(0, 4))} /></div>
        <div style={{ marginTop: 16 }}><Turnstile ref={ts} accion="rastreo" alCambiar={setToken} /></div>
        {error && <p className="err" role="alert">{error}</p>}
        <button className="btn full" style={{ marginTop: 14 }} disabled={!token || buscando || tel4.length !== 4 || folio.length < 4}>{buscando ? 'Buscando…' : 'Buscar'}</button>
      </form>
      <button className="link" style={{ marginTop: 18 }} onClick={() => nav('/tienda')}>Volver a la tienda</button>
    </div></main>
  );
}
