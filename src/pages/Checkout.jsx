import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ArrowLeft, ArrowRight, Upload, Check, MessageCircle, Lock, Sparkles } from 'lucide-react';
import { useStore, normTel, puntosDe, PUNTO_MXN } from '../lib/store';
import { ENTREGAS, cotizarPaqueteria, cotizarDidi, ALCALDIAS, mxn, waLink } from '../lib/catalog';
import { useProductos } from '../lib/tienda';
import { LOGO, TLink, Iris } from '../ui';

const HORAS = ['12:00', '15:30', '18:00'];
const ETAPAS = ['WhatsApp', 'Entrega', 'Datos', 'Pago'];
function dias() { const out = []; const d = new Date(); for (let i = 1; out.length < 5; i++) { const x = new Date(d); x.setDate(d.getDate() + i); if (x.getDay() !== 0) out.push(x); } return out; }
const fmtDia = (d) => d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' });
async function comprimir(file) {
  const url = URL.createObjectURL(file);
  const img = await new Promise((r, j) => { const i = new Image(); i.onload = () => r(i); i.onerror = j; i.src = url; });
  const s = Math.min(1, 900 / Math.max(img.width, img.height));
  const c = document.createElement('canvas'); c.width = img.width * s; c.height = img.height * s;
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/webp', 0.6); // ~60–120 KB
}
const VACIA = { calle: '', colonia: '', ciudad: '', estado: '', cp: '' };

export default function Checkout() {
  const { bolsa, crearPedido, notificar, clientes, pedidos, guardarCliente, login } = useStore();
  const productos = useProductos();
  const nav = useNavigate();
  const root = useRef();
  const [paso, setPaso] = useState(0);
  const [tel, setTel] = useState(useStore.getState().sesion || '');
  const [cli, setCli] = useState(null);
  const [tipo, setTipo] = useState('metro');
  const [metro, setMetro] = useState({ est: 'Pantitlán', dia: 0, hora: '15:30', otra: '' });
  const [didi, setDidi] = useState({ alc: 'Iztacalco' });
  const [rates, setRates] = useState(null);
  const [rate, setRate] = useState(null);
  const [nombre, setNombre] = useState('');
  const [dir, setDir] = useState(VACIA);
  const [dirSel, setDirSel] = useState(-1);
  const [guardarDir, setGuardarDir] = useState(true);
  const [usarPts, setUsarPts] = useState(false);
  const [metodo, setMetodo] = useState('whatsapp');
  const [comp, setComp] = useState(null);
  const ds = dias();

  useGSAP(() => { gsap.from('.co-step > *', { y: 30, opacity: 0, stagger: 0.05, duration: 0.8, ease: 'expo.out', clearProps: 'transform' }); }, { scope: root, dependencies: [paso] });
  useGSAP(() => { if (rates) gsap.from('.rates .opt', { y: 16, opacity: 0, stagger: 0.06, duration: 0.6, ease: 'expo.out' }); }, { scope: root, dependencies: [rates] });
  useEffect(() => { if (tipo === 'paqueteria' && /^\d{5}$/.test(dir.cp) && !rates) setRates(cotizarPaqueteria(dir.cp)); }, [tipo]);

  if (!bolsa.length) return <main className="co"><div className="wrap empty"><p className="h-m" style={{ marginBottom: 16 }}>Tu bolsa está vacía</p><TLink className="btn" to="/tienda">Ir a la tienda</TLink></div></main>;

  const pts = cli ? puntosDe(tel, pedidos, clientes) : 0;
  const sub = bolsa.reduce((a, b) => a + b.precio * b.cant, 0);
  const desc = usarPts ? Math.min(Math.floor(pts * PUNTO_MXN), Math.floor(sub * 0.3)) : 0;
  const ptsUsados = Math.ceil(desc / PUNTO_MXN);
  const costo = tipo === 'metro' ? 0 : tipo === 'metro-otra' ? 60 : tipo === 'didi' ? cotizarDidi(didi.alc) : rate?.costo ?? null;
  const total = sub - desc + (costo || 0);
  const necesitaDir = tipo === 'paqueteria' || tipo === 'didi';
  const entregaOk = tipo === 'metro' || (tipo === 'metro-otra' && metro.otra.trim()) || tipo === 'didi' || (tipo === 'paqueteria' && rate);
  const datosOk = nombre.trim().length > 2 && (!necesitaDir || (dir.calle && dir.colonia && (tipo === 'didi' || (dir.ciudad && dir.estado))));

  const buscar = () => {
    const t = normTel(tel); if (t.length !== 10) return notificar('Escribe tu WhatsApp a 10 dígitos');
    const c = clientes[t]; setCli(c || false); login(t);
    if (c) { setNombre(c.nombre); if (c.direcciones?.[0]) { setDir(c.direcciones[0]); setDirSel(0); } }
  };
  const cotizar = () => { if (!/^\d{5}$/.test(dir.cp)) return notificar('Escribe un código postal de 5 dígitos'); setRate(null); setRates(cotizarPaqueteria(dir.cp)); };
  const sd = (k) => (e) => { setDir({ ...dir, [k]: e.target.value }); setDirSel(-1); };

  const confirmar = () => {
    const t = normTel(tel);
    const dTxt = `${dir.calle}, ${dir.colonia}, ${dir.ciudad}${dir.estado ? ', ' + dir.estado : ''}${dir.cp ? ', CP ' + dir.cp : ''}`;
    const entrega = tipo === 'paqueteria' ? { tipo, paq: rate.paq, servicio: rate.servicio, costo, detalle: `${rate.paq} ${rate.servicio}`, cp: dir.cp, ciudad: dir.ciudad, dir: dTxt }
      : tipo === 'didi' ? { tipo, costo, detalle: `DiDi · ${didi.alc}`, dir: `${dir.calle}, ${dir.colonia}, ${didi.alc}` }
      : { tipo: 'metro', costo, detalle: `Metro ${tipo === 'metro' ? metro.est : metro.otra}`, cita: `${fmtDia(ds[metro.dia])} · ${metro.hora}` };
    const dirs = cli?.direcciones || [];
    const nuevaDir = necesitaDir && guardarDir && dirSel === -1 && dir.calle;
    const lente = bolsa.find((b) => productos.find((p) => p.id === b.id)?.tipo === 'lente');
    guardarCliente({ tel: t, nombre, direcciones: nuevaDir ? [dir, ...dirs] : dirs, ...(lente ? { receta: { od: lente.od, oi: lente.oi } } : {}) });
    const f = crearPedido({ clienta: nombre, tel: t, items: bolsa, entrega, subtotal: sub, descuento: desc, puntosUsados: ptsUsados, total, comprobante: metodo === 'whatsapp' ? 'whatsapp' : comp });
    if (metodo === 'whatsapp') {
      const lineas = bolsa.map((b) => `• ${b.cant}× ${b.nombre}${b.od !== '0.00' || b.oi !== '0.00' ? ` (OD ${b.od} / OI ${b.oi})` : ''}`).join('\n');
      const msg = `Hola Pupilentes AGO 💛 Soy ${nombre}. Acabo de hacer mi pedido *${f}*:\n${lineas}\nEntrega: ${entrega.detalle}${entrega.cita ? ' · ' + entrega.cita : ''}\n*Total transferido: ${mxn(total)}*\nTe adjunto mi comprobante 👇`;
      window.open(waLink(msg), '_blank');
    }
    nav(`/pedido/${f}?nuevo=1`);
  };

  return (
    <div className="cx" ref={root}>
      <header className="cx-top"><div className="wrap">
        <TLink to="/" className="brand"><img src={LOGO} alt="" />PUPILENTES AGO</TLink>
        <ol className="cx-steps">{ETAPAS.map((e, i) => <li key={e} className={i < paso ? 'done' : i === paso ? 'on' : ''}><span>{i < paso ? <Check size={12} /> : i + 1}</span>{e}</li>)}</ol>
        <span className="cx-lock"><Lock size={14} /> Caja</span>
      </div></header>
      <main className="co"><div className="wrap grid">
        <div>
          <button className="mute" style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 14 }} onClick={() => (paso ? setPaso(paso - 1) : nav('/tienda'))}><ArrowLeft size={16} /> {paso ? 'Atrás' : 'Seguir comprando'}</button>

          {paso === 0 && (<div className="co-step">
            <p className="eyebrow" style={{ marginTop: 26 }}>Paso 1 de 4</p>
            <h1 className="h-l" style={{ margin: '10px 0 14px' }}>¿Cuál es tu <span className="it gold">WhatsApp?</span></h1>
            <p className="lead">Si ya compraste antes, llenamos tus datos y ves tus puntos. Si eres nueva, te registramos al terminar.</p>
            <div className="cx-tel"><span className="mono">+52</span><input className="mono" inputMode="tel" autoFocus value={tel} onChange={(e) => { setTel(e.target.value.replace(/[^\d ]/g, '')); setCli(null); }} onKeyDown={(e) => e.key === 'Enter' && buscar()} placeholder="55 1234 5678" aria-label="WhatsApp" /><button className="btn" onClick={buscar}>Continuar</button></div>
            <p className="mute" style={{ fontSize: 13 }}>Demo: prueba con <button className="link" onClick={() => setTel('5512345678')}>55 1234 5678</button> (clienta registrada).</p>
            {cli && <div className="cx-hola"><Iris fam="cafe" size={56} /><div><b>¡Hola de nuevo, {cli.nombre.split(' ')[0]}!</b><span>Tienes <b className="gold">{pts} puntos AGO</b> (= {mxn(pts * PUNTO_MXN)}) para usar hoy.</span></div><button className="btn" onClick={() => setPaso(1)}>Seguir <ArrowRight size={18} /></button></div>}
            {cli === false && <div className="cx-hola"><Sparkles size={26} className="gold" /><div><b>¡Bienvenida!</b><span>Con esta compra abres tu cuenta AGO y empiezas a sumar puntos.</span></div><button className="btn" onClick={() => setPaso(1)}>Seguir <ArrowRight size={18} /></button></div>}
          </div>)}

          {paso === 1 && (<div className="co-step">
            <p className="eyebrow" style={{ marginTop: 26 }}>Paso 2 de 4</p><h1 className="h-l" style={{ margin: '10px 0 24px' }}>¿Cómo lo quieres <span className="it gold">recibir?</span></h1>
            {ENTREGAS.map((e) => (
              <button key={e.id} className={'opt ' + (tipo === e.id ? 'on' : '')} onClick={() => setTipo(e.id)}>
                <span className="ic">{e.icon}</span><span className="t"><b>{e.nombre}</b><small>{e.detalle}</small></span>
                <span className="c">{e.costo === 0 ? 'Gratis' : e.costo ? `+${mxn(e.costo)}` : 'Cotizar'}</span>
              </button>))}
            <div className="box" style={{ marginTop: 18 }}>
              {(tipo === 'metro' || tipo === 'metro-otra') && (<>
                {tipo === 'metro' ? <div className="seg">{['Pantitlán', 'Tepalcates'].map((s) => <button key={s} className={metro.est === s ? 'on' : ''} onClick={() => setMetro({ ...metro, est: s })}>Metro {s}</button>)}</div>
                  : <div className="field" style={{ marginTop: 0 }}><label>¿Qué estación?</label><input className="inp" value={metro.otra} onChange={(e) => setMetro({ ...metro, otra: e.target.value })} placeholder="Ej. Metro Zaragoza" /></div>}
                <div className="field"><label>Día</label><div className="frow">{ds.map((x, i) => <button key={i} className={'chip ' + (metro.dia === i ? 'on' : '')} onClick={() => setMetro({ ...metro, dia: i })}>{fmtDia(x)}</button>)}</div></div>
                <div className="field"><label>Hora</label><div className="frow">{HORAS.map((h) => <button key={h} className={'chip mono ' + (metro.hora === h ? 'on' : '')} onClick={() => setMetro({ ...metro, hora: h })}>{h}</button>)}</div></div>
              </>)}
              {tipo === 'didi' && (<>
                <div className="field" style={{ marginTop: 0 }}><label>Alcaldía o municipio</label><select className="inp" value={didi.alc} onChange={(e) => setDidi({ alc: e.target.value })}>{ALCALDIAS.map((a) => <option key={a}>{a}</option>)}</select></div>
                <p className="note">Costo estimado del DiDi: <b className="mono">{mxn(cotizarDidi(didi.alc))}</b>. Te lo confirmamos con tu dirección exacta antes de pedirlo.</p>
              </>)}
              {tipo === 'paqueteria' && (<>
                <label className="eyebrow" htmlFor="cp">Tu código postal</label>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <input id="cp" className="inp mono" inputMode="numeric" maxLength={5} value={dir.cp} onChange={(e) => { setDir({ ...dir, cp: e.target.value.replace(/\D/g, '') }); setRates(null); setRate(null); }} onKeyDown={(e) => e.key === 'Enter' && cotizar()} placeholder="00000" style={{ fontSize: 22, letterSpacing: '.2em', height: 56 }} />
                  <button className="btn" style={{ height: 56 }} onClick={cotizar}>Cotizar</button>
                </div>
                {rates && <div className="rates">{rates.map((r) => (
                  <button key={r.id} className={'opt ' + (rate?.id === r.id ? 'on' : '')} onClick={() => setRate(r)}>
                    <span className="ic">{r.paq.slice(0, 3).toUpperCase()}</span><span className="t"><b>{r.paq} · {r.servicio}</b><small>{r.dias} hábiles · guía con rastreo</small></span><span className="c">{mxn(r.costo)}</span>
                  </button>))}</div>}
              </>)}
            </div>
            <button className="btn full" style={{ marginTop: 20, height: 58 }} disabled={!entregaOk} onClick={() => setPaso(2)}>Continuar <ArrowRight size={18} /></button>
          </div>)}

          {paso === 2 && (<div className="co-step">
            <p className="eyebrow" style={{ marginTop: 26 }}>Paso 3 de 4</p><h1 className="h-l" style={{ margin: '10px 0 10px' }}>Tus <span className="it gold">datos</span></h1>
            <p className="mute" style={{ marginBottom: 6 }}>{tipo === 'paqueteria' ? 'Se usan tal cual para generar tu guía de envío.' : 'Para confirmarte por WhatsApp.'}</p>
            <div className="field"><label>Nombre completo</label><input className="inp" value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" /></div>
            {necesitaDir && (<>
              {cli?.direcciones?.length > 0 && <div className="field"><label>Enviar a</label>
                {cli.direcciones.map((d, i) => <button key={i} className={'opt ' + (dirSel === i ? 'on' : '')} onClick={() => { setDir(d); setDirSel(i); if (tipo === 'paqueteria') { setRates(cotizarPaqueteria(d.cp)); } }}><span className="ic">{i + 1}</span><span className="t"><b>{d.calle}</b><small>{d.colonia}, {d.ciudad}, CP {d.cp}</small></span></button>)}
                <button className={'opt ' + (dirSel === -1 ? 'on' : '')} onClick={() => { setDir({ ...VACIA, cp: tipo === 'paqueteria' ? dir.cp : '' }); setDirSel(-1); }}><span className="ic">+</span><span className="t"><b>Otra dirección</b><small>Por ejemplo, tu trabajo</small></span></button>
              </div>}
              {dirSel === -1 && (<>
                <div className="field"><label>Calle y número</label><input className="inp" value={dir.calle} onChange={sd('calle')} autoComplete="street-address" /></div>
                <div className="two"><div className="field"><label>Colonia</label><input className="inp" value={dir.colonia} onChange={sd('colonia')} /></div>
                  {tipo === 'paqueteria' && <div className="field"><label>Ciudad / municipio</label><input className="inp" value={dir.ciudad} onChange={sd('ciudad')} /></div>}</div>
                {tipo === 'paqueteria' && <div className="two"><div className="field"><label>Estado</label><input className="inp" value={dir.estado} onChange={sd('estado')} /></div><div className="field"><label>Código postal</label><input className="inp mono" value={dir.cp} disabled /></div></div>}
                <label className="check"><input type="checkbox" checked={guardarDir} onChange={(e) => setGuardarDir(e.target.checked)} /> Guardar esta dirección para la próxima</label>
              </>)}
            </>)}
            <button className="btn full" style={{ marginTop: 22, height: 58 }} disabled={!datosOk} onClick={() => setPaso(3)}>Ir al pago <ArrowRight size={18} /></button>
          </div>)}

          {paso === 3 && (<div className="co-step">
            <p className="eyebrow" style={{ marginTop: 26 }}>Paso 4 de 4</p><h1 className="h-l" style={{ margin: '10px 0 22px' }}>Transfiere y <span className="it gold">listo</span></h1>
            {pts >= 20 && <label className="check box" style={{ marginTop: 0, marginBottom: 14 }}><input type="checkbox" checked={usarPts} onChange={(e) => setUsarPts(e.target.checked)} /><span style={{ flex: 1 }}>Usar mis puntos AGO <span className="mute">· tienes {pts}</span></span><b className="mono gold">−{mxn(Math.min(Math.floor(pts * PUNTO_MXN), Math.floor(sub * 0.3)))}</b></label>}
            <div className="bank">
              <div>Banco <b>BBVA (demo)</b></div><div>CLABE <b>0121 8000 1234 5678 90</b></div><div>Titular <b>Pupilentes AGO (demo)</b></div>
              <div>Monto exacto <b style={{ fontSize: 22 }}>{mxn(total)}</b></div>
            </div>
            <p className="eyebrow" style={{ margin: '24px 0 10px' }}>¿Cómo nos mandas tu comprobante?</p>
            <button className={'opt ' + (metodo === 'whatsapp' ? 'on' : '')} onClick={() => setMetodo('whatsapp')}><span className="ic"><MessageCircle size={18} /></span><span className="t"><b>Por WhatsApp <span className="tg gold" style={{ marginLeft: 6 }}>Recomendado</span></b><small>Se abre el chat con tu pedido ya escrito; solo adjuntas la captura y envías.</small></span></button>
            <button className={'opt ' + (metodo === 'subir' ? 'on' : '')} onClick={() => setMetodo('subir')}><span className="ic"><Upload size={18} /></span><span className="t"><b>Subirlo aquí</b><small>Lo revisamos al momento.</small></span></button>
            {metodo === 'subir' && <>
              <label className={'upload ' + (comp ? 'ok' : '')}>
                <input type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) { try { setComp(await comprimir(f)); } catch { notificar('No pude leer esa imagen'); } } }} />
                {comp ? <><Check size={20} /> Comprobante listo · tocar para cambiar</> : <><Upload size={20} /> Subir foto o captura del comprobante</>}
              </label>
              {comp && <img src={comp} alt="Comprobante" className="proof" style={{ marginTop: 12 }} />}
            </>}
            <button className="btn full gold" style={{ marginTop: 22, height: 60 }} disabled={metodo === 'subir' && !comp} onClick={confirmar}>{metodo === 'whatsapp' ? <><MessageCircle size={18} /> Apartar y abrir WhatsApp</> : 'Apartar mi pedido'}</button>
            <p className="mute" style={{ fontSize: 13, marginTop: 10 }}>Tus piezas quedan apartadas 24 h mientras validamos tu pago.</p>
          </div>)}
        </div>

        <aside className="aside box cx-sum">
          <p className="eyebrow" style={{ marginBottom: 12 }}>Tu pedido</p>
          {bolsa.map((b, i) => { const p = productos.find((x) => x.id === b.id); return (
            <div key={i} className="cx-it">{p?.tipo === 'lente' ? <Iris p={p} size={48} glint={false} /> : <span className="iris" style={{ width: 48, background: 'var(--sand)' }} />}
              <span style={{ flex: 1 }}><b>{b.cant}× {b.nombre}</b>{(b.graduacion ?? b.od) !== '0.00' && <span className="mono mute" style={{ display: 'block', fontSize: 12 }}>Graduación {b.graduacion ?? b.od} · el par</span>}</span><span className="mono">{mxn(b.precio * b.cant)}</span></div>); })}
          <div style={{ borderTop: '1px solid var(--line)', margin: '12px 0' }} />
          <div className="sum"><span>Subtotal</span><span className="mono">{mxn(sub)}</span></div>
          {desc > 0 && <div className="sum gold"><span>Puntos AGO</span><span className="mono">−{mxn(desc)}</span></div>}
          <div className="sum"><span>Envío</span><span className="mono">{costo === null ? '—' : costo === 0 ? 'Gratis' : mxn(costo)}</span></div>
          <div className="sum t"><span>Total</span><span className="mono">{mxn(total)}</span></div>
          <p className="mute" style={{ fontSize: 13, marginTop: 8 }}>Con esta compra sumas <b className="gold">{Math.floor((sub - desc) / 10)} puntos AGO</b>.</p>
        </aside>
      </div></main>
    </div>
  );
}
