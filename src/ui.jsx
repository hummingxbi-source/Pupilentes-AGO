import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingBag, Menu, X, MessageCircle, Minus, Plus, Camera, ArrowRight } from 'lucide-react';
import gsap from 'gsap';
import { useStore } from './lib/store';
import { A, familia, irisSrc, mxn, INTENSIDAD, waLink } from './lib/catalog';
import { useProductos, varianteDe, NEUTRO, NOMBRE_DUR, srcsetDe } from './lib/tienda';

export const LOGO = A('logo-pupilentes-ago-512.png');

export function Iris({ p, fam, size, className = '', style, glint = true }) {
  const src = p ? irisSrc(p) : A(`img/iris/${familia(fam)?.iris || fam}.webp`);
  return (
    <div className={'iris ' + className} style={{ width: size, ...style }}>
      <img src={src} alt="" loading="lazy" decoding="async" style={{ filter: p?.filtro || 'none' }} />
      {glint && <span className="glint" />}
    </div>
  );
}

/* ---------- Transición de página (cortina con el nombre del módulo, como Soka) ---------- */
const WORDS = { '': 'AGO', tienda: 'Tienda', tono: 'Tu tono', probador: 'Lookbook', nosotros: 'Nosotros', cuenta: 'Mi cuenta', checkout: 'Caja', pedido: 'Mi pedido', panel: 'Panel' };
export const wordFor = (path) => WORDS[path.split('?')[0].split('/')[1] || ''] || 'AGO';
const RM = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
let covered = false;
// Señal para que cada página arranque su entrada cuando la cortina ya se abrió
export const onReady = (cb) => (window.__agoReady ? cb() : addEventListener('ago-ready', cb, { once: true }));
const ready = () => { if (!window.__agoReady) { window.__agoReady = true; dispatchEvent(new Event('ago-ready')); } };
function setWord(w) {
  const k = document.querySelector('.curtain .k'); if (!k) return;
  k.innerHTML = (w === 'AGO' ? `<span class="lg"><img src="${LOGO}" alt=""></span>` : '') + [...w].map((c) => `<span>${c === ' ' ? '&nbsp;' : c}</span>`).join('');
}
export function Curtain() {
  const { pathname } = useLocation();
  const first = useRef(true);
  useLayoutEffect(() => {
    const el = document.querySelector('.curtain');
    if (RM()) { gsap.set(el, { display: 'none' }); return; }
    const outro = () => gsap.timeline().to('.curtain .k > span', { yPercent: -170, opacity: 0, stagger: 0.035, duration: 0.42, ease: 'power3.in' }, '+=.2')
      .to(el, { clipPath: 'inset(0 0 100% 0)', duration: 0.75, ease: 'power4.inOut' }, '-=.1').set(el, { display: 'none' });
    if (first.current) {
      first.current = false; setWord(wordFor(pathname));
      gsap.set(el, { display: 'grid', clipPath: 'inset(0 0 0% 0)' });
      const tl = gsap.timeline().fromTo('.curtain .k > span', { yPercent: 170, opacity: 0 }, { yPercent: 0, opacity: 1, stagger: 0.06, duration: 0.7, ease: 'power4.out' });
      if (pathname === '/') tl.add(() => apertura(el)); else tl.add(outro()).add(ready, '-=.5');
    } else if (covered) { covered = false; outro().add(ready, 0.45); }
    else ready();
  }, [pathname]);
  return <div className="curtain" aria-hidden="true"><div className="k" /></div>;
}
/* Entrada de la landing: el logo empuja las letras, queda al centro, el fondo se abre
   como un diafragma desde el ojo y el logo vuela a su lugar en el menú. */
function apertura(el) {
  const lg = el.querySelector('.lg img'); const letras = el.querySelectorAll('.k > span:not(.lg)');
  const brand = document.querySelector('.nav .brand img');
  const r0 = lg.getBoundingClientRect();
  const fly = lg.cloneNode(); fly.className = 'fly-logo';
  Object.assign(fly.style, { left: r0.left + 'px', top: r0.top + 'px', width: r0.width + 'px', height: r0.height + 'px' });
  document.body.appendChild(fly); lg.style.visibility = 'hidden';
  if (brand) gsap.set(brand, { opacity: 0 });
  const cx = innerWidth / 2 - (r0.left + r0.width / 2), cy = innerHeight / 2 - (r0.top + r0.height / 2);
  const R = Math.hypot(innerWidth, innerHeight);
  el.classList.add('ap'); el.style.setProperty('--r', '0px');
  const tl = gsap.timeline({ onComplete: () => { fly.remove(); el.classList.remove('ap'); gsap.set(el, { display: 'none' }); lg.style.visibility = ''; } });
  tl.to(letras, { x: () => innerWidth * 0.12, opacity: 0, filter: 'blur(10px)', stagger: { each: 0.06, from: 'end' }, duration: 0.7, ease: 'power3.in' }, '+=.35')
    .to(fly, { x: cx, y: cy, scale: 1.35, rotate: 360, duration: 1.1, ease: 'expo.inOut' }, '-=.55')
    .to(fly, { boxShadow: '0 0 0 18px rgba(217,199,163,.08), 0 0 0 46px rgba(217,199,163,.04)', duration: 0.6 }, '-=.3')
    .addLabel('abre', '+=.15')
    .to(el, { '--r': R + 'px', duration: 1.5, ease: 'expo.inOut' }, 'abre')
    .add(ready, 'abre+=.55');
  if (brand) {
    const b = brand.getBoundingClientRect();
    tl.to(fly, { x: b.left + b.width / 2 - (r0.left + r0.width / 2), y: b.top + b.height / 2 - (r0.top + r0.height / 2), scale: b.width / r0.width, rotate: 720, boxShadow: '0 0 0 0 rgba(0,0,0,0)', duration: 1.4, ease: 'expo.inOut' }, 'abre+=.1')
      .set(brand, { opacity: 1 }).set(fly, { opacity: 0 });
  } else tl.to(fly, { opacity: 0, duration: 0.6 }, 'abre+=.5');
}

export function useGo() {
  const nav = useNavigate(); const loc = useLocation();
  return (to) => {
    if (to.split('?')[0] === loc.pathname && !to.includes('?')) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    if (RM() || to.split('/')[1] === loc.pathname.split('/')[1]) { nav(to); return; }
    setWord(wordFor(to)); window.__agoReady = false;
    const el = document.querySelector('.curtain');
    gsap.set(el, { display: 'grid', clipPath: 'inset(100% 0 0 0)' });
    gsap.timeline().to(el, { clipPath: 'inset(0% 0 0 0)', duration: 0.6, ease: 'power4.inOut' })
      .fromTo('.curtain .k > span', { yPercent: 170, opacity: 0 }, { yPercent: 0, opacity: 1, stagger: 0.05, duration: 0.5, ease: 'power4.out' }, '-=.2')
      .add(() => { covered = true; nav(to); });
  };
}
export function TLink({ to, children, onClick, ...rest }) {
  const go = useGo();
  return <a href={to} onClick={(e) => { if (e.metaKey || e.ctrlKey) return; e.preventDefault(); onClick?.(e); go(to); }} {...rest}>{children}</a>;
}

const NAV = [['/tienda', 'Tienda'], ['/tono', 'Tu tono'], ['/probador', 'Lookbook'], ['/nosotros', 'Nosotros'], ['/cuenta', 'Mi cuenta']];

export function Nav({ dark }) {
  const n = useStore((s) => s.bolsa.reduce((a, b) => a + b.cant, 0));
  const abrir = useStore((s) => s.abrirBolsa);
  const sesion = useStore((s) => s.sesion);
  const [solid, setSolid] = useState(false);
  const [hide, setHide] = useState(false);
  const [menu, setMenu] = useState(false);
  const loc = useLocation();
  const links = useRef();
  useEffect(() => setMenu(false), [loc.pathname]);
  useEffect(() => {
    let last = 0;
    const on = () => { const y = window.scrollY; setSolid(y > 40); setHide(y > 400 && y > last); last = y; };
    on(); window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  useEffect(() => { document.body.style.overflow = menu ? 'hidden' : ''; }, [menu]);
  // indicador que se desliza a la pestaña activa
  useEffect(() => {
    const box = links.current; if (!box) return;
    const a = box.querySelector('a.on'); const ind = box.querySelector('.ind');
    if (!a) { gsap.to(ind, { opacity: 0, duration: 0.2 }); return; }
    gsap.to(ind, { left: a.offsetLeft, width: a.offsetWidth, opacity: 1, duration: 0.6, ease: 'expo.out' });
  }, [loc.pathname]);
  const on = (to) => loc.pathname.startsWith(to);
  return (
    <>
      <header className={`nav ${solid ? 'solid' : ''} ${dark ? 'dark' : ''} ${hide && !menu ? 'hide' : ''}`}>
        <div className="wrap">
          <TLink to="/" className="brand" aria-label="Pupilentes AGO, inicio"><img src={LOGO} alt="" />PUPILENTES AGO</TLink>
          <nav className="links" aria-label="Principal" ref={links}>
            <span className="ind" />
            {NAV.map(([to, l]) => <TLink key={to} to={to} className={on(to) ? 'on' : ''} aria-current={on(to) ? 'page' : undefined}>{l === 'Mi cuenta' && sesion ? 'Mis puntos' : l}</TLink>)}
          </nav>
          <div className="acts">
            <button className="icon-btn" onClick={() => abrir(true)} aria-label={`Bolsa, ${n} piezas`}>
              <ShoppingBag size={20} strokeWidth={1.5} />{n > 0 && <span className="badge">{n}</span>}
            </button>
            <button className="icon-btn burger" onClick={() => setMenu(!menu)} aria-label="Menú">{menu ? <X size={22} /> : <Menu size={22} strokeWidth={1.5} />}</button>
          </div>
        </div>
      </header>
      {menu && (
        <div className="mnav">
          {[['/', 'Inicio', 'AGO'], ['/tienda', 'Tienda', '16 TONOS'], ['/tono', 'Tu tono', 'TEST'], ['/probador', 'Lookbook', 'FOTOS'], ['/nosotros', 'Nosotros', 'HISTORIA'], ['/cuenta', 'Mi cuenta', 'PUNTOS']].map(([to, l, s]) => (
            <TLink key={to} className={'big ' + (loc.pathname === to || (to !== '/' && on(to)) ? 'on' : '')} to={to}>{l} <small>{s}</small></TLink>))}
          <div className="foot">
            <a className="btn light" href={waLink('Hola, tengo una duda sobre mis pupilentes')} target="_blank" rel="noreferrer"><MessageCircle size={18} /> WhatsApp</a>
            <TLink className="btn line-light" to="/panel">Panel de la tienda</TLink>
          </div>
        </div>
      )}
    </>
  );
}

// Navega a una sección de la landing desde cualquier ruta
export function goTo(sel) {
  if (location.pathname !== '/') {
    try { sessionStorage.setItem('goto', sel); } catch { /* sin storage */ }
    location.assign('/'); return;
  }
  document.querySelector(sel)?.scrollIntoView({ behavior: 'smooth' });
}

export function Footer() {
  return (
    <footer className="foot">
      <div className="wrap">
        <div className="big">Pupilentes <em>AGO</em></div>
        <div className="cols">
          <div>
            <h5>La tienda</h5>
            <p style={{ color: 'rgba(251,250,247,.7)', maxWidth: '34ch' }}>Pupilentes de color con y sin graduación. Atención personal desde CDMX, por WhatsApp.</p>
          </div>
          <div><h5>Comprar</h5><TLink to="/tienda">Tienda en línea</TLink><TLink to="/tono">Encuentra tu tono</TLink><TLink to="/probador">Lookbook</TLink><TLink to="/nosotros">Nuestra historia</TLink><TLink to="/cuenta">Mis puntos y pedidos</TLink></div>
          <div><h5>Síguenos</h5><a href="https://www.instagram.com/" target="_blank" rel="noreferrer">Instagram</a><a href="https://www.tiktok.com/" target="_blank" rel="noreferrer">TikTok</a><a href="https://www.mercadolibre.com.mx/" target="_blank" rel="noreferrer">Mercado Libre</a></div>
          <div><h5>Contacto</h5><a href={waLink('Hola, quiero información')} target="_blank" rel="noreferrer">WhatsApp 55 7111 3508</a><a href="mailto:pupilentesago@gmail.com">pupilentesago@gmail.com</a><TLink to="/panel">Panel de la dueña</TLink></div>
        </div>
        <div className="legal"><span>© {new Date().getFullYear()} Pupilentes AGO · CDMX</span><span>Demo diseñada por HummingX BI</span></div>
      </div>
    </footer>
  );
}

export function Drawer({ open, onClose, title, children, footer, sheet }) {
  const ref = useRef(); const scrim = useRef();
  const [show, setShow] = useState(open);
  useEffect(() => {
    if (open) { setShow(true); document.body.style.overflow = 'hidden'; }
    else if (show) {
      const mob = window.innerWidth <= 700 && sheet;
      gsap.to(ref.current, { [mob ? 'yPercent' : 'xPercent']: 100, duration: 0.35, ease: 'power2.in' });
      gsap.to(scrim.current, { opacity: 0, duration: 0.3, onComplete: () => { setShow(false); document.body.style.overflow = ''; } });
    }
  }, [open]);
  useEffect(() => {
    if (show && open) {
      const mob = window.innerWidth <= 700 && sheet;
      gsap.fromTo(ref.current, { [mob ? 'yPercent' : 'xPercent']: 100 }, { [mob ? 'yPercent' : 'xPercent']: 0, duration: 0.55, ease: 'expo.out' });
      gsap.fromTo(scrim.current, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      const k = (e) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
    }
  }, [show, open]);
  if (!show) return null;
  return (
    <>
      <div className="scrim" ref={scrim} onClick={onClose} />
      <aside className={'drawer ' + (sheet ? 'sheet' : '')} ref={ref} role="dialog" aria-modal="true" aria-label={title}>
        <div className="grab" />
        <div className="dh"><span className="eyebrow">{title}</span><button className="icon-btn" onClick={onClose} aria-label="Cerrar"><X size={20} /></button></div>
        <div className="db">{children}</div>
        {footer && <div className="df">{footer}</div>}
      </aside>
    </>
  );
}

function Stock({ n }) {
  if (n == null) return null;
  if (n <= 0) return <div className="st no"><i />Agotado en esta graduación</div>;
  if (n <= 2) return <div className="st low"><i />{n === 1 ? 'Último par' : `Últimos ${n} pares`}</div>;
  return <div className="st"><i />Disponible</div>;
}

// Ficha: color/diseño (el tono) → duración → graduación (o "sin graduación").
// Siempre se vende por PAR: la misma graduación en ambos ojos (FRONTEND.md §3).
// El precio mostrado es informativo; el que se cobra lo calcula el servidor (Fase 3).
export function ProductSheet({ p, onClose, grad0 }) {
  const agregar = useStore((s) => s.agregar);
  const productos = useProductos();
  const prod = productos.find((x) => x.id === p?.id) || p;
  const [dur, setDur] = useState(null);
  const [conGrad, setConGrad] = useState(false);
  const [grad, setGrad] = useState('-1.00');
  const [kit, setKit] = useState(false);
  const solucion = productos.find((x) => x.tipo === 'accesorio' && /solucion/.test(x.id));

  useEffect(() => {
    if (!prod?.variantes) return;
    const d = prod.duraciones.at(-1) ?? null;               // por defecto la más larga
    const grads = prod.variantes.filter((v) => v.duracion === d && v.graduacion !== NEUTRO);
    const pedida = grad0 && grad0 !== NEUTRO ? grad0 : null;
    const g = (pedida && grads.find((v) => v.graduacion === pedida)) || grads.find((v) => v.disponible > 0) || grads[0];
    setDur(d); setConGrad(!!pedida); setGrad(g?.graduacion ?? '-1.00'); setKit(false);
  }, [p?.id]);

  // Al cambiar de duración, si la graduación elegida no existe ahí, pasa a la primera con existencia
  useEffect(() => {
    const gs = (prod?.variantes || []).filter((x) => x.duracion === dur && x.graduacion !== NEUTRO);
    if (gs.length && !gs.some((x) => x.graduacion === grad)) setGrad((gs.find((x) => x.disponible > 0) || gs[0]).graduacion);
  }, [dur]);

  if (!prod) return <Drawer open={false} onClose={onClose} />;
  const f = familia(prod.familia);
  const deDur = (prod.variantes || []).filter((v) => v.duracion === dur);
  const gradsDur = deDur.filter((v) => v.graduacion !== NEUTRO);
  const hayNeutro = deDur.some((v) => v.graduacion === NEUTRO);
  const usaGrad = conGrad || !hayNeutro;
  const v = varianteDe(prod, dur, usaGrad ? grad : NEUTRO);
  const ok = !!v && v.disponible > 0;
  const precio = v?.precio ?? prod.precio;
  const solV = solucion?.variantes?.[0];
  const add = () => {
    agregar({ id: prod.id, sku: v.sku, nombre: prod.nombre, alias: prod.alias, duracion: dur, graduacion: v.graduacion, od: v.graduacion, oi: v.graduacion, cant: 1, precio });
    if (kit && solV) agregar({ id: solucion.id, sku: solV.sku, nombre: solucion.nombre, graduacion: NEUTRO, od: NEUTRO, oi: NEUTRO, cant: 1, precio: solV.precio });
    onClose();
  };
  return (
    <Drawer open={!!p} onClose={onClose} title={f?.nombre} sheet
      footer={<button className="btn full" disabled={!ok} onClick={add}>{ok ? <>Agregar a la bolsa · {mxn(precio + (kit && solV ? solV.precio : 0))}</> : 'Sin existencia en esa graduación'}</button>}>
      <div className="pd-top">
        <Iris p={prod} />
        <div>
          <div className="alias" style={{ font: 'italic 400 16px var(--display)', color: 'var(--mute)' }}>{prod.alias}</div>
          <h2 className="h-s" style={{ fontSize: 28, margin: '2px 0 6px' }}>{prod.nombre}</h2>
          <div className="mono" style={{ fontSize: 15 }}>{mxn(precio)} <span className="mute" style={{ fontSize: 13 }}>· el par</span></div>
          <div className="meter">{[1, 2, 3].map((i) => <i key={i} className={i <= prod.intensidad ? 'on' : ''} />)}<span style={{ marginLeft: 6 }}>{INTENSIDAD[prod.intensidad]}</span></div>
        </div>
      </div>
      <p style={{ color: 'var(--ink-2)', marginBottom: 18 }}>{prod.desc}</p>
      {prod.foto && <img src={A(prod.foto)} srcSet={srcsetDe(prod.foto, A)} sizes="(max-width: 700px) 100vw, 480px" alt={`${prod.nombre} en ojos reales`} style={{ borderRadius: 12, marginBottom: 18, width: '100%', aspectRatio: '16/10', objectFit: 'cover' }} loading="lazy" />}
      {prod.duraciones.filter(Boolean).length > 1 && (<>
        <div className="eyebrow" style={{ marginBottom: 10 }}>Duración</div>
        <div className="seg" style={{ marginBottom: 18 }}>
          {prod.duraciones.map((d) => <button key={d} className={dur === d ? 'on' : ''} onClick={() => setDur(d)}>{NOMBRE_DUR[d]}</button>)}
        </div>
      </>)}
      <div className="eyebrow" style={{ marginBottom: 10 }}>¿Usas graduación?</div>
      <div className="seg">
        <button className={!usaGrad ? 'on' : ''} disabled={!hayNeutro} onClick={() => setConGrad(false)}>Sin graduación</button>
        <button className={usaGrad ? 'on' : ''} disabled={!gradsDur.length} onClick={() => setConGrad(true)}>Con graduación</button>
      </div>
      {usaGrad ? (
        <>
          <div className="eye-sel" style={{ marginTop: 14 }}><div className="lb"><span>GRADUACIÓN (AMBOS OJOS)</span><span>{dur ? NOMBRE_DUR[dur] : ''}</span></div>
            <select value={grad} onChange={(e) => setGrad(e.target.value)} aria-label="Graduación">{gradsDur.map((x) => <option key={x.graduacion} value={x.graduacion}>{x.graduacion}{x.disponible ? '' : ' · agotado'}</option>)}</select>
            <Stock n={v?.disponible} /></div>
          <p className="note">Se vende por par, con la misma graduación en ambos ojos. Si cada ojo es distinto, <a className="link" href={waLink(`Hola, me interesa ${prod.nombre} con graduación distinta en cada ojo`)} target="_blank" rel="noreferrer">escríbenos por WhatsApp</a>.</p>
        </>
      ) : (<div style={{ marginTop: 10 }}><Stock n={v?.disponible} /></div>)}
      {solV && <label className="check box" style={{ marginTop: 18 }}><input type="checkbox" checked={kit} onChange={(e) => setKit(e.target.checked)} /> <span style={{ flex: 1 }}>Agregar {solucion.nombre.toLowerCase()} <span className="mute">· recomendada si es tu primer par</span></span><b className="mono">+{mxn(solV.precio)}</b></label>}
      <div style={{ display: 'flex', gap: 16, marginTop: 18, fontSize: 13.5, color: 'var(--mute)', flexWrap: 'wrap' }}>
        {prod.duracion && <span>Duración: {prod.duracion}</span>}<span>Incluye estuche</span>
        <TLink to={`/probador?tono=${prod.id}`} className="link" style={{ color: 'var(--ink)', display: 'inline-flex', gap: 6, alignItems: 'center' }} onClick={onClose}><Camera size={14} /> Verlo en el lookbook</TLink>
      </div>
    </Drawer>
  );
}

export function Bag() {
  const { bolsa, bolsaAbierta, abrirBolsa, cambiarCant, quitar } = useStore();
  const productos = useProductos();
  const nav = useGo();
  const sub = bolsa.reduce((a, b) => a + b.precio * b.cant, 0);
  return (
    <Drawer open={bolsaAbierta} onClose={() => abrirBolsa(false)} title={`Tu bolsa · ${bolsa.reduce((a, b) => a + b.cant, 0)}`}
      footer={bolsa.length > 0 && (<><div className="sum t"><span>Subtotal</span><span className="mono">{mxn(sub)}</span></div><p className="mute" style={{ fontSize: 13, margin: '4px 0 12px' }}>El envío se cotiza en el siguiente paso.</p><button className="btn full" onClick={() => { abrirBolsa(false); nav('/checkout'); }}>Elegir entrega <ArrowRight size={18} /></button></>)}>
      {bolsa.length === 0 ? (
        <div className="empty"><p className="h-s" style={{ marginBottom: 10 }}>Tu bolsa está vacía</p><button className="btn ghost sm" onClick={() => { abrirBolsa(false); nav('/tienda'); }}>Ver tonos</button></div>
      ) : bolsa.map((b, i) => {
        const p = productos.find((x) => x.id === b.id);
        return (
          <div className="bag-item" key={i}>
            {p?.tipo === 'lente' ? <Iris p={p} /> : <div className="iris" style={{ background: 'var(--sand)', width: 64 }} />}
            <div>
              <b style={{ fontWeight: 500 }}>{b.nombre}</b>
              {p?.tipo === 'lente' && <div className="mono mute" style={{ fontSize: 12.5 }}>{(b.graduacion ?? b.od) === NEUTRO ? 'Sin graduación' : `Graduación ${b.graduacion ?? b.od}`}{b.duracion ? ` · ${NOMBRE_DUR[b.duracion]}` : ''}</div>}
              <div className="qty"><button onClick={() => cambiarCant(i, -1)} aria-label="Menos"><Minus size={14} /></button><span>{b.cant}</span><button onClick={() => cambiarCant(i, 1)} aria-label="Más"><Plus size={14} /></button></div>
            </div>
            <div style={{ textAlign: 'right' }}><div className="mono">{mxn(b.precio * b.cant)}</div><button className="mute" style={{ fontSize: 12.5, marginTop: 8 }} onClick={() => quitar(i)}>Quitar</button></div>
          </div>
        );
      })}
    </Drawer>
  );
}

export function Toast() {
  const t = useStore((s) => s.toast);
  const ref = useRef();
  useEffect(() => { if (t && ref.current) gsap.fromTo(ref.current, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'expo.out' }); }, [t?.id]);
  if (!t) return null;
  return <div className="toast" ref={ref} role="status"><i />{t.msg}</div>;
}

export function WaFab() {
  return <a className="wa-fab" href={waLink('Hola, tengo una duda sobre mis pupilentes')} target="_blank" rel="noreferrer" aria-label="Escríbenos por WhatsApp"><MessageCircle size={22} strokeWidth={1.6} /></a>;
}
