import { useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Droplet, Package, Sparkles, Plus } from 'lucide-react';
import { Iris, ProductSheet } from '../ui';
import { useStore, piezas, gradsDisponibles } from '../lib/store';
import { A, FAMILIAS, INTENSIDAD, mxn, familia } from '../lib/catalog';
import { useProductos, useCatalogo, NEUTRO, srcsetDe } from '../lib/tienda';

export default function Tienda() {
  const [qs, setQs] = useSearchParams();
  const fam = qs.get('f') || 'todos';
  const productos = useProductos();
  const { estado, cargar } = useCatalogo();
  const agregar = useStore((s) => s.agregar);
  const [int, setInt] = useState('0');
  const [grad, setGrad] = useState('');
  const [sheet, setSheet] = useState(null);
  const root = useRef();

  const lentes = useMemo(() => productos.filter((p) => p.tipo === 'lente' && p.visible && (int === '0' || String(p.intensidad) === int)), [productos, int]);
  // Se vende por par: basta con 1 par disponible en esa graduación
  const disp = (p) => (grad ? piezas(p, grad) >= 1 : true);
  const gradsCatalogo = useMemo(() => [...new Set(productos.filter((p) => p.tipo === 'lente').flatMap((p) => p.variantes.map((v) => v.graduacion)))].filter((g) => g !== NEUTRO).sort((a, b) => b - a), [productos]);
  const orden = (arr) => [...arr].sort((a, b) => disp(b) - disp(a) || (b.top ? 1 : 0) - (a.top ? 1 : 0));
  const fams = fam === 'todos' ? FAMILIAS : FAMILIAS.filter((f) => f.id === fam);

  // Título: una sola vez. Tarjetas: cada vez que cambia el filtro o llega el catálogo de la BD.
  // fromTo (no from): si la animación se repite a medias, from() tomaría la posición intermedia
  // como destino y el título/tarjetas se quedarían atorados a la mitad.
  useGSAP(() => {
    gsap.fromTo('.shop-head h1 .ln > span', { yPercent: 110 }, { yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: 0.08 });
  }, { scope: root });
  useGSAP(() => {
    gsap.fromTo('.card', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: 'expo.out', stagger: 0.04, clearProps: 'transform,opacity' });
  }, { scope: root, dependencies: [fam, int, grad, productos.length] });

  const setFam = (id) => { const n = new URLSearchParams(qs); id === 'todos' ? n.delete('f') : n.set('f', id); setQs(n, { replace: true }); };

  return (
    <main ref={root}>
      <section className="shop-head"><div className="wrap row">
        <div>
          <p className="eyebrow">Tienda en línea</p>
          <h1 className="h-l" style={{ marginTop: 10 }}><span className="ln" style={{ display: 'block', overflow: 'hidden' }}><span style={{ display: 'inline-block' }}>Elige tu <span className="it gold">tono</span></span></span></h1>
        </div>
        <p className="lead" style={{ maxWidth: '40ch' }}>{lentes.length} tonos en {new Set(lentes.map((p) => p.familia)).size} familias. Selecciona tu graduación y te mostramos primero lo que hay para ti.</p>
      </div></section>

      <div className="filters"><div className="wrap">
        <div className="frow" role="tablist" aria-label="Familia">
          <button className={'chip ' + (fam === 'todos' ? 'on' : '')} onClick={() => setFam('todos')}>Todos</button>
          {FAMILIAS.map((f) => <button key={f.id} className={'chip ' + (fam === f.id ? 'on' : '')} onClick={() => setFam(f.id)}><span className="dot" style={{ background: f.hex }} />{f.nombre}</button>)}
          <button className={'chip ' + (fam === 'acc' ? 'on' : '')} onClick={() => setFam('acc')}>Accesorios</button>
          <span className="fsel" style={{ marginLeft: 4 }}>Efecto<select value={int} onChange={(e) => setInt(e.target.value)} aria-label="Efecto"><option value="0">Todos</option>{[1, 2, 3].map((i) => <option key={i} value={i}>{INTENSIDAD[i]}</option>)}</select></span>
        </div>
        <label className="fsel">Mi graduación
          <select value={grad} onChange={(e) => setGrad(e.target.value)}><option value="">—</option><option value="0.00">Sin graduación</option>{gradsCatalogo.map((g) => <option key={g}>{g}</option>)}</select>
        </label>
      </div></div>

      <div className="wrap" style={{ paddingBottom: 100 }}>
        {estado === 'cargando' && !productos.length && <p className="empty" role="status">Cargando catálogo…</p>}
        {estado === 'error' && !productos.length && <div className="empty" role="alert"><p>No pudimos cargar el catálogo.</p><button className="btn ghost sm" style={{ marginTop: 12 }} onClick={() => cargar({ forzar: true })}>Reintentar</button></div>}
        {fam !== 'acc' && fams.map((f) => {
          const items = orden(lentes.filter((p) => p.familia === f.id));
          if (!items.length) return null;
          return (
            <section className="fam-sec" key={f.id}>
              <div className="fam-sec-head"><Iris fam={f.id} /><div><h2>{f.nombre}</h2><p>{f.frase}</p></div></div>
              <div className="grid-p">{items.map((p) => <Card key={p.id} p={p} grad={grad} onOpen={() => setSheet(p)} />)}</div>
            </section>
          );
        })}
        {fam !== 'acc' && estado === 'listo' && !lentes.length && <p className="empty">No hay tonos con ese filtro.</p>}
        {(fam === 'todos' || fam === 'acc') && (
          <section className="fam-sec">
            <div className="fam-sec-head"><div className="iris" style={{ width: 52, background: 'var(--sand)', display: 'grid', placeItems: 'center', color: 'var(--gold-d)' }}><Sparkles size={20} /></div><div><h2>Accesorios</h2><p>Lo necesario para cuidar tus lentes.</p></div></div>
            <div className="acc-grid">{productos.filter((p) => p.tipo === 'accesorio' && p.visible).map((p, i) => { const v = p.variantes[0]; const hay = v?.disponible > 0; return (
              <div className="acc" key={p.id} style={{ opacity: hay ? 1 : 0.55 }}>
                <div className="ic">{[<Droplet key={0} />, <Package key={1} />, <Sparkles key={2} />][i % 3]}</div>
                <div className="t"><b>{p.nombre}</b><small>{hay ? p.alias : 'Agotado'}</small><div className="mono" style={{ fontSize: 14, marginTop: 4 }}>{mxn(p.precio)}</div></div>
                <button className="icon-btn" style={{ border: '1px solid var(--line)' }} disabled={!hay} aria-label={`Agregar ${p.nombre}`} onClick={() => agregar({ id: p.id, sku: v.sku, nombre: p.nombre, graduacion: NEUTRO, od: NEUTRO, oi: NEUTRO, cant: 1, precio: v.precio })}><Plus size={18} /></button>
              </div>); })}
            </div>
          </section>
        )}
      </div>
      <ProductSheet p={sheet} grad0={grad} onClose={() => setSheet(null)} />
    </main>
  );
}

function Card({ p, grad, onOpen }) {
  const f = familia(p.familia);
  const ok = grad ? piezas(p, grad) >= 1 : true;
  return (
    <button className="card" onClick={onOpen} style={{ opacity: ok ? 1 : 0.55 }}>
      <div className="ph" style={{ background: f.fondo }}>
        <div className="tags">{p.top ? <span className="tg gold">Más vendido</span> : <span />}<span className="tg">{INTENSIDAD[p.intensidad]}</span></div>
        <Iris p={p} />
        {p.foto && <img className="real" src={A(p.foto)} srcSet={srcsetDe(p.foto, A)} sizes="(max-width: 700px) 50vw, 25vw" alt="" loading="lazy" />}
      </div>
      <div className="meta">
        <div className="alias">{p.alias}</div>
        <div className="nm">{p.nombre}</div>
        <div className="pr"><b>{mxn(p.precio)}</b>
          <span className="av"><i className={ok ? '' : 'no'} />{grad ? (ok ? `Hay en ${grad}` : `Agotado en ${grad}`) : `${gradsDisponibles(p)} graduaciones`}</span>
        </div>
      </div>
    </button>
  );
}
