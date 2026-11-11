import { useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ArrowLeft, ArrowRight, Check, RotateCcw, ShoppingBag } from 'lucide-react';
import { Iris, ProductSheet, TLink } from '../ui';
import { useStore, piezas } from '../lib/store';
import { A, FAMILIAS, GRADS, INTENSIDAD, mxn, familia } from '../lib/catalog';
import { useProductos, LOOKBOOK } from '../lib/tienda';

const OJOS = [
  { v: 'negro', l: 'Negros', s: 'o café muy oscuro', fam: 'cafe', f: 'brightness(.32) saturate(.6)' },
  { v: 'cafe', l: 'Café', s: 'el más común en México', fam: 'cafe', f: 'brightness(.6)' },
  { v: 'miel', l: 'Miel o avellana', s: 'cálidos y claros', fam: 'cafe', f: 'none' },
  { v: 'claro', l: 'Claros', s: 'verdes, azules o grises', fam: 'verde', f: 'saturate(.7)' },
];
const OCASION = [['diario', 'Diario', 'Escuela, mandados, todos los días'], ['oficina', 'Trabajo', 'Que se vea pulido y discreto'], ['fiesta', 'Fiestas y eventos', 'Bodas, XV, salidas de noche'], ['fotos', 'Fotos y contenido', 'Sesiones, TikTok, reels']];
const PIEL = [['clara', 'Clara', '#EBCDB4', 3], ['media', 'Media', '#D2A27C', 1], ['morena', 'Morena', '#A86F4C', 2], ['oscura', 'Oscura', '#6B4430', 4]];
const PASOS = ['ojos', 'efecto', 'familias', 'ocasion', 'piel', 'grad'];

function puntuar(p, r) {
  let s = 52; const why = [];
  const fams = r.familias?.length ? r.familias : FAMILIAS.map((f) => f.id);
  if (fams.includes(p.familia)) { s += 22; if (r.familias?.length) why.push(`Es de la familia que elegiste: ${familia(p.familia).nombre.toLowerCase()}.`); } else s -= 40;
  const d = Math.abs(p.intensidad - r.efecto); s -= d * 13;
  if (!d) why.push(`Su efecto es ${INTENSIDAD[p.intensidad].toLowerCase()}, justo lo que buscas.`);
  const oscuros = ['negro', 'cafe'].includes(r.ojos);
  if (oscuros && p.intensidad === 3) { s += 6; why.push('Tiene contorno marcado: cubre bien ojos oscuros.'); }
  if (oscuros && r.efecto === 1 && ['cafe', 'verde'].includes(p.familia)) { s += 8; why.push('En ojos oscuros este tono se ve como si fuera tuyo.'); }
  if (['fiesta', 'fotos'].includes(r.ocasion)) { s += 4 * p.intensidad; if (p.intensidad > 1) why.push('Se luce en fotos y con luz de noche.'); } else { s += 4 * (3 - p.intensidad); if (p.intensidad < 3) why.push('Discreto para usar todos los días.'); }
  if (r.piel === 'clara' && ['azul', 'gris'].includes(p.familia)) { s += 5; why.push('Los fríos contrastan muy bonito con piel clara.'); }
  if (['morena', 'oscura'].includes(r.piel) && ['cafe', 'verde', 'gris'].includes(p.familia)) { s += 5; why.push('Resalta muchísimo con piel morena.'); }
  if (r.grad && r.grad !== '0.00') { if (piezas(p, r.grad) >= 1) why.push(`Hay piezas en tu graduación (${r.grad}).`); else { s -= 30; why.push(`Ahorita no hay en ${r.grad}.`); } }
  if (p.top) s += 3;
  return { p, match: Math.max(58, Math.min(98, Math.round(s))), why: why.slice(0, 3) };
}

const Q = ({ children, n }) => <h1 className="tq-q"><span className="eyebrow" style={{ color: 'var(--gold-l)', display: 'block', marginBottom: 14 }}>Pregunta {n} de 6</span>{children}</h1>;

export default function Tono() {
  const productos = useProductos();
  const [paso, setPaso] = useState(0);
  const [r, setR] = useState({ efecto: 2, familias: [], grad: '' });
  const [usaGrad, setUsaGrad] = useState(null);
  const [sel, setSel] = useState(0);
  const [vista, setVista] = useState('rostro');
  const [sheet, setSheet] = useState(null);
  const root = useRef();
  const fin = paso >= PASOS.length;

  const res = useMemo(() => fin ? productos.filter((p) => p.tipo === 'lente' && p.visible && LOOKBOOK.has(p.id)).map((p) => puntuar(p, r)).sort((a, b) => b.match - a.match).slice(0, 3) : [], [fin, r, productos]);
  const modelo = (PIEL.find((x) => x[0] === r.piel) || PIEL[1])[3];

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.fromTo('.tq-anim', { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'none' })
      .from('.tq-q .eyebrow', { y: 12, opacity: 0, duration: 0.6 }, 0)
      .from('.tq-q .ln > span', { yPercent: 115, duration: 0.9, stagger: 0.07 }, 0.05)
      .from('.tq-opt', { y: 30, opacity: 0, stagger: 0.06, duration: 0.8, clearProps: 'transform' }, 0.2)
      .from('.tq-foot', { opacity: 0, duration: 0.5 }, 0.45);
    gsap.fromTo('.tq-eye .iris', { scale: 0.92, rotate: -25 }, { scale: 1, rotate: 0, duration: 1.1, ease: 'expo.out' });
    gsap.to('.tq-prog i.on', { keyframes: [{ scaleY: 3, duration: 0.2 }, { scaleY: 1, duration: 0.4 }] });
    if (fin) {
      tl.from('.tr-photo', { clipPath: 'inset(100% 0 0 0)', duration: 1.4, ease: 'expo.inOut' }, 0)
        .from('.tr-alt', { y: 40, opacity: 0, stagger: 0.1, duration: 0.9 }, '-=.6');
      const o = { v: 0 }; gsap.to(o, { v: res[sel]?.match || 0, duration: 1.6, ease: 'power2.out', onUpdate: () => { const el = document.querySelector('.tr-match b'); if (el) el.textContent = Math.round(o.v) + '%'; } });
    }
  }, { scope: root, dependencies: [paso, sel] });

  const ir = (n) => {
    gsap.timeline({ onComplete: () => { setPaso(n); setSel(0); } })
      .to('.tq-opt, .tq-foot', { y: -16, opacity: 0, stagger: 0.03, duration: 0.25, ease: 'power2.in' })
      .to('.tq-q .ln > span', { yPercent: -115, stagger: 0.04, duration: 0.35, ease: 'power3.in' }, 0)
      .to('.tq-q .eyebrow, .tr', { opacity: 0, duration: 0.25 }, 0);
  };
  const pick = (k, v, next = true) => { setR({ ...r, [k]: v }); if (next) setTimeout(() => ir(paso + 1), 220); };
  const toggleFam = (id) => setR({ ...r, familias: r.familias.includes(id) ? r.familias.filter((x) => x !== id) : [...r.familias, id] });

  // iris de vista previa que reacciona a las respuestas
  const prevFam = r.familias.length ? r.familias[r.familias.length - 1] : (OJOS.find((o) => o.v === r.ojos)?.fam || 'azul');
  const prevFiltro = paso === 0 && r.ojos ? OJOS.find((o) => o.v === r.ojos).f : `saturate(${0.55 + r.efecto * 0.3}) contrast(${0.9 + r.efecto * 0.07})`;

  const top = res[sel];

  return (
    <main className="tq" ref={root}>
      <div className="wrap">
        <div className="tq-prog">{PASOS.map((p, i) => <i key={p} className={i < paso ? 'done' : i === paso ? 'on' : ''} />)}</div>
        {!fin ? (
          <div className="tq-grid">
            <div className="tq-anim" key={paso}>
              {paso === 0 && <><Q n={1}><span className="ln"><span>¿De qué color son</span></span> <span className="ln"><span className="it">tus ojos hoy?</span></span></Q>
                <div className="tq-opts four">{OJOS.map((o) => <button key={o.v} className={'tq-opt ' + (r.ojos === o.v ? 'on' : '')} onClick={() => pick('ojos', o.v)}><Iris fam={o.fam} glint style={{ width: 64, filter: o.f }} /><b>{o.l}</b><small>{o.s}</small></button>)}</div></>}
              {paso === 1 && <><Q n={2}><span className="ln"><span>¿Qué tanto quieres</span></span> <span className="ln"><span className="it">que se note?</span></span></Q>
                <div className="tq-slider tq-opt">
                  <input type="range" min="1" max="3" step="1" value={r.efecto} onChange={(e) => setR({ ...r, efecto: +e.target.value })} aria-label="Intensidad" />
                  <div className="lbls">{[1, 2, 3].map((i) => <button key={i} className={r.efecto === i ? 'on' : ''} onClick={() => setR({ ...r, efecto: i })}><b>{INTENSIDAD[i]}</b><small>{['Nadie nota que son lentes', 'Se nota el cambio, se ve real', 'Que todos pregunten'][i - 1]}</small></button>)}</div>
                </div></>}
              {paso === 2 && <><Q n={3}><span className="ln"><span>¿Qué familia</span></span> <span className="ln"><span className="it">te llama?</span></span></Q>
                <p className="tq-hint">Puedes elegir varias, o ninguna para que te sorprendamos.</p>
                <div className="tq-opts four">{FAMILIAS.map((f) => <button key={f.id} className={'tq-opt ' + (r.familias.includes(f.id) ? 'on' : '')} onClick={() => toggleFam(f.id)}><Iris fam={f.id} style={{ width: 64 }} /><b>{f.nombre}</b><small>{f.frase}</small>{r.familias.includes(f.id) && <span className="tick"><Check size={14} /></span>}</button>)}</div></>}
              {paso === 3 && <><Q n={4}><span className="ln"><span>¿Para cuándo</span></span> <span className="ln"><span className="it">los quieres?</span></span></Q>
                <div className="tq-opts four">{OCASION.map(([v, l, s], i) => <button key={v} className={'tq-opt ' + (r.ocasion === v ? 'on' : '')} onClick={() => pick('ocasion', v)}><span className="big-n">0{i + 1}</span><b>{l}</b><small>{s}</small></button>)}</div></>}
              {paso === 4 && <><Q n={5}><span className="ln"><span>¿Cuál se parece</span></span> <span className="ln"><span className="it">a tu tono de piel?</span></span></Q>
                <p className="tq-hint">Te mostraremos el resultado en alguien con un tono parecido.</p>
                <div className="tq-opts four">{PIEL.map(([v, l, c, m]) => <button key={v} className={'tq-opt ' + (r.piel === v ? 'on' : '')} onClick={() => pick('piel', v)}><span className="sw" style={{ background: c }}><img src={A(`img/lookbook/antes-${m}-mirada.webp`)} alt="" /></span><b>{l}</b></button>)}</div></>}
              {paso === 5 && <><Q n={6}><span className="ln"><span>¿Usas</span></span> <span className="ln"><span className="it">graduación?</span></span></Q>
                <div className="tq-opts two">
                  <button className={'tq-opt ' + (usaGrad === false ? 'on' : '')} onClick={() => { setUsaGrad(false); pick('grad', '0.00'); }}><b>No</b><small>Solo quiero cambiar el color</small></button>
                  <button className={'tq-opt ' + (usaGrad ? 'on' : '')} onClick={() => setUsaGrad(true)}><b>Sí, para miopía</b><small>Revisamos que haya piezas para ti</small>
                    {usaGrad && <select className="inp mono" value={r.grad} onClick={(e) => e.stopPropagation()} onChange={(e) => pick('grad', e.target.value)} style={{ marginTop: 10 }}><option value="">Elige tu graduación</option>{GRADS.slice(1).map((g) => <option key={g}>{g}</option>)}</select>}
                  </button>
                </div></>}
              <div className="tq-foot">
                {paso > 0 && <button className="btn line-light sm" onClick={() => ir(paso - 1)}><ArrowLeft size={16} /> Atrás</button>}
                {[1, 2].includes(paso) && <button className="btn light" onClick={() => ir(paso + 1)}>{paso === 2 && !r.familias.length ? 'Sorpréndeme' : 'Siguiente'} <ArrowRight size={18} /></button>}
              </div>
            </div>
            <div className="tq-eye" aria-hidden="true">
              <div className="ring" />
              <Iris fam={prevFam} style={{ width: '100%', filter: prevFiltro, transition: 'filter .6s' }} />
            </div>
          </div>
        ) : top && (
          <div className="tr">
            <figure className="tr-photo">
              <img src={A(`img/lookbook/${top.p.id}-${modelo}-${vista}.webp`)} alt={`${top.p.nombre} en una persona con piel ${r.piel}`} />
              <div className="tr-views">{['rostro', 'mirada', 'detalle'].map((v) => <button key={v} className={vista === v ? 'on' : ''} onClick={() => setVista(v)}>{v}</button>)}</div>
            </figure>
            <div className="tr-info">
              <p className="eyebrow" style={{ color: 'var(--gold-l)' }}>{sel === 0 ? 'Tu tono ideal' : `Opción ${sel + 1}`}</p>
              <h1 className="h-xl" style={{ fontSize: 'clamp(48px,7vw,120px)', margin: '10px 0 4px' }}>{top.p.nombre}</h1>
              <p className="it serif" style={{ fontSize: 22, color: 'rgba(251,250,247,.7)' }}>{top.p.alias}</p>
              <div className="tr-match"><b>0%</b><span>de coincidencia contigo</span></div>
              <ul className="tr-why">{top.why.map((w) => <li key={w}><Check size={16} />{w}</li>)}</ul>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 26 }}>
                <button className="btn light" onClick={() => setSheet(top.p)}><ShoppingBag size={18} /> Lo quiero · {mxn(r.grad && r.grad !== '0.00' ? top.p.precioGraduado : top.p.precio)}</button>
                <TLink to={`/probador?tono=${top.p.id}&m=${modelo}`} className="btn line-light">Ver en el lookbook</TLink>
              </div>
              <div className="tr-alts">
                {res.map((x, i) => <button key={x.p.id} className={'tr-alt ' + (i === sel ? 'on' : '')} onClick={() => setSel(i)}><Iris p={x.p} glint={false} /><span><b>{x.p.nombre}</b><small>{x.match}% · {INTENSIDAD[x.p.intensidad]}</small></span></button>)}
              </div>
              <button className="tq-redo" onClick={() => { setR({ efecto: 2, familias: [], grad: '' }); setUsaGrad(null); ir(0); }}><RotateCcw size={14} /> Volver a hacer el test</button>
            </div>
          </div>
        )}
      </div>
      <ProductSheet p={sheet} grad0={r.grad} onClose={() => setSheet(null)} />
    </main>
  );
}
