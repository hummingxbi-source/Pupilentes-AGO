import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Camera, ShoppingBag, X, MoveHorizontal } from 'lucide-react';
import { Iris, ProductSheet } from '../ui';
import { useStore } from '../lib/store';
import { A, FAMILIAS, texSrc, mxn, INTENSIDAD } from '../lib/catalog';
import { useProductos, LOOKBOOK } from '../lib/tienda';

const PERSONAS = [[3, 'Ana', 'piel clara'], [1, 'Mariana', 'piel media'], [2, 'Itzel', 'piel morena'], [4, 'Zuri', 'piel oscura']];
const VISTAS = [['rostro', 'Rostro'], ['mirada', 'Mirada'], ['detalle', 'Detalle']];
const img = (t, m, v) => A(`img/lookbook/${t === 'antes' ? `antes-${m}` : `${t}-${m}`}-${v}.webp`);

export default function Probador() {
  const productos = useProductos();
  // Solo los tonos que tienen fotos de lookbook (public/img/lookbook/<tono>-…)
  const lentes = productos.filter((p) => p.tipo === 'lente' && p.visible && LOOKBOOK.has(p.id));
  const [qs] = useSearchParams();
  const [tono, setTono] = useState(qs.get('tono') || 'angeles-n-blue');
  const [m, setM] = useState(+qs.get('m') || 1);
  const [vista, setVista] = useState('rostro');
  const [comp, setComp] = useState('antes');
  const [fam, setFam] = useState(null);
  const [pos, setPos] = useState(92);
  const [sheet, setSheet] = useState(null);
  const [cam, setCam] = useState(false);
  const root = useRef(); const stage = useRef();
  const p = lentes.find((x) => x.id === tono) || lentes[0];
  const famAct = fam || p?.familia;

  useGSAP(() => {
    gsap.from('.lb-head .ln > span', { yPercent: 110, duration: 1.1, ease: 'expo.out', stagger: 0.08, delay: 0.5 });
    gsap.from('.lb-side > *', { y: 30, opacity: 0, duration: 0.9, ease: 'expo.out', stagger: 0.06, delay: 0.7 });
    // al cargar, la cortina de comparación barre para enseñar el antes/después
    const o = { v: 92 }; gsap.to(o, { v: 50, duration: 1.6, ease: 'expo.inOut', delay: 1.1, onUpdate: () => setPos(o.v) });
  }, { scope: root });
  useGSAP(() => { gsap.fromTo('.lb-stage .base', { opacity: 0.2, scale: 1.04 }, { opacity: 1, scale: 1, duration: 0.8, ease: 'expo.out' }); gsap.from('.lb-info > *', { y: 14, opacity: 0, stagger: 0.04, duration: 0.6, ease: 'expo.out' }); }, { scope: root, dependencies: [tono, m, vista] });

  const drag = (e) => {
    const r = stage.current.getBoundingClientRect();
    const mv = (ev) => { const x = (ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left; setPos(Math.max(0, Math.min(100, (x / r.width) * 100))); };
    mv(e);
    const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); };
    addEventListener('pointermove', mv); addEventListener('pointerup', up);
  };
  const compNombre = comp === 'antes' ? 'Sin lentes' : lentes.find((x) => x.id === comp)?.nombre;

  if (!p) return <main className="wrap" style={{ padding: '160px 0' }}><p className="empty" role="status">Cargando lookbook…</p></main>;
  return (
    <main className="lbk" ref={root}>
      <div className="wrap">
        <div className="lb-head">
          <div><p className="eyebrow">Lookbook</p><h1 className="h-l" style={{ marginTop: 10 }}><span className="ln"><span>Así se ven</span></span> <span className="ln"><span className="it gold">en otras personas</span></span></h1></div>
          <p className="lead">Elige un tono y una persona parecida a ti. Desliza para comparar con sus ojos naturales o con otro tono.</p>
        </div>
        <div className="lb-grid">
          <div>
            <div className={'lb-stage v-' + vista} ref={stage} onPointerDown={drag} style={{ touchAction: 'pan-y' }}>
              <img className="base" src={img(p.id, m, vista)} alt={`${p.nombre} en ${PERSONAS.find((x) => x[0] === m)[1]}`} draggable="false" />
              <div className="over" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}><img src={img(comp, m, vista)} alt="" draggable="false" /></div>
              <div className="handle" style={{ left: pos + '%' }}><span><MoveHorizontal size={18} /></span></div>
              <span className="lbl l">{compNombre}</span><span className="lbl r">{p.nombre}</span>
            </div>
            <div className="lb-bar">
              <div className="seg-d">{VISTAS.map(([v, l]) => <button key={v} className={vista === v ? 'on' : ''} onClick={() => setVista(v)}>{l}</button>)}</div>
              <div className="lb-people">{PERSONAS.map(([id, n, s]) => <button key={id} className={m === id ? 'on' : ''} onClick={() => setM(id)} aria-label={`${n}, ${s}`}><img src={img(p.id, id, 'rostro')} alt="" /><span>{n}<small>{s}</small></span></button>)}</div>
            </div>
            <p className="mute" style={{ fontSize: 12.5, marginTop: 10 }}>Demo: imágenes ilustrativas. En la versión final van fotos reales de cada tono puesto.</p>
          </div>
          <aside className="lb-side">
            <div className="lb-info">
              <p className="eyebrow">{FAMILIAS.find((f) => f.id === p.familia).nombre}</p>
              <h2 className="h-m" style={{ margin: '6px 0 2px' }}>{p.nombre}</h2>
              <p className="it serif mute" style={{ fontSize: 19 }}>{p.alias}</p>
              <div className="meter">{[1, 2, 3].map((i) => <i key={i} className={i <= p.intensidad ? 'on' : ''} />)}<span style={{ marginLeft: 6 }}>{INTENSIDAD[p.intensidad]}</span></div>
              <p style={{ margin: '14px 0', color: 'var(--ink-2)' }}>{p.desc}</p>
            </div>
            <div className="frow" style={{ margin: '6px 0 12px' }}>{FAMILIAS.map((f) => <button key={f.id} className={'chip ' + (famAct === f.id ? 'on' : '')} onClick={() => setFam(f.id)}><span className="dot" style={{ background: f.hex }} />{f.nombre}</button>)}</div>
            <div className="lb-tones">{lentes.filter((x) => x.familia === famAct).map((x) => <button key={x.id} className={x.id === tono ? 'on' : ''} onClick={() => setTono(x.id)}><Iris p={x} glint={false} /><span>{x.nombre}</span></button>)}</div>
            <label className="field"><label>Comparar contra</label>
              <select className="inp" value={comp} onChange={(e) => setComp(e.target.value)}><option value="antes">Sus ojos sin lentes</option>{lentes.filter((x) => x.id !== tono).map((x) => <option key={x.id} value={x.id}>{x.nombre} · {x.alias}</option>)}</select>
            </label>
            <button className="btn full" style={{ marginTop: 18 }} onClick={() => setSheet(p)}><ShoppingBag size={18} /> Lo quiero · {mxn(p.precio)}</button>
            <button className="btn ghost full" style={{ marginTop: 10 }} onClick={() => setCam(true)}><Camera size={18} /> Pruébalos en ti con la cámara</button>
          </aside>
        </div>
      </div>
      {cam && <Camara p={p} onClose={() => setCam(false)} />}
      <ProductSheet p={sheet} onClose={() => setSheet(null)} />
    </main>
  );
}

/* ---------- Probador con cámara (MediaPipe, todo local) ---------- */
const IRIS = [{ c: 468, r: [469, 470, 471, 472] }, { c: 473, r: [474, 475, 476, 477] }];
const LID = [[33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246], [263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466]];
let lmP = null;
const getLm = () => (lmP ||= (async () => {
  const { FilesetResolver, FaceLandmarker } = await import('@mediapipe/tasks-vision');
  const fs = await FilesetResolver.forVisionTasks(new URL(A('mediapipe/wasm'), location.href).href);
  const o = (d) => ({ baseOptions: { modelAssetPath: new URL(A('models/face_landmarker.task'), location.href).href, delegate: d }, runningMode: 'VIDEO', numFaces: 1 });
  try { return await FaceLandmarker.createFromOptions(fs, o('GPU')); } catch { return await FaceLandmarker.createFromOptions(fs, o('CPU')); }
})());

function Camara({ p, onClose }) {
  const cv = useRef(); const tex = useRef(new Image()); const off = useRef(document.createElement('canvas'));
  const [estado, setEstado] = useState('Preparando cámara…');
  const pr = useRef(p); pr.current = p;
  useEffect(() => { tex.current.src = texSrc(p); }, [p.id]);
  useEffect(() => {
    let raf, stream, vivo = true;
    (async () => {
      try {
        const lm = await getLm();
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 720, height: 900 } });
        const v = document.createElement('video'); v.srcObject = stream; v.playsInline = true; v.muted = true; await v.play();
        if (!vivo) return; setEstado('');
        const loop = () => {
          const c = cv.current; if (!c) return;
          if (c.width !== v.videoWidth) { c.width = v.videoWidth; c.height = v.videoHeight; }
          const ctx = c.getContext('2d'), w = c.width, h = c.height;
          ctx.save(); ctx.translate(w, 0); ctx.scale(-1, 1); ctx.drawImage(v, 0, 0); ctx.restore();
          const mk = lm.detectForVideo(v, performance.now()).faceLandmarks?.[0]?.map((q) => ({ x: 1 - q.x, y: q.y }));
          if (mk && tex.current.complete) IRIS.forEach((ir, k) => {
            const cx = mk[ir.c].x * w, cy = mk[ir.c].y * h;
            const r = ir.r.reduce((a, i) => a + Math.hypot(mk[i].x * w - cx, mk[i].y * h - cy), 0) / 4 * 1.08; if (r < 2) return;
            const o = off.current, s = Math.ceil(r * 2); o.width = s; o.height = s; const oc = o.getContext('2d');
            oc.filter = pr.current.filtro || 'none'; oc.drawImage(tex.current, 0, 0, s, s); oc.filter = 'none';
            oc.globalCompositeOperation = 'destination-in'; const g = oc.createRadialGradient(s / 2, s / 2, r * 0.8, s / 2, s / 2, r); g.addColorStop(0, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)'); oc.fillStyle = g; oc.fillRect(0, 0, s, s);
            ctx.save(); ctx.beginPath(); LID[k].forEach((i, j) => (j ? ctx.lineTo(mk[i].x * w, mk[i].y * h) : ctx.moveTo(mk[i].x * w, mk[i].y * h))); ctx.closePath(); ctx.clip();
            ctx.globalAlpha = 0.85; ctx.drawImage(o, cx - r, cy - r, s, s); ctx.restore();
          });
          raf = requestAnimationFrame(loop);
        };
        loop();
      } catch (e) { console.warn(e); setEstado('No pudimos abrir la cámara. Revisa los permisos del navegador.'); }
    })();
    return () => { vivo = false; cancelAnimationFrame(raf); stream?.getTracks().forEach((t) => t.stop()); };
  }, []);
  return (
    <div className="modal" role="dialog" aria-modal="true"><div className="scrim" onClick={onClose} />
      <div className="mbox cam-box">
        <button className="icon-btn" style={{ position: 'absolute', right: 10, top: 10, zIndex: 2, background: 'var(--paper)' }} onClick={onClose} aria-label="Cerrar"><X size={20} /></button>
        <div className="pv-stage" style={{ aspectRatio: '4/5' }}><canvas ref={cv} />{estado && <div className="ov"><p>{estado}</p></div>}</div>
        <p style={{ marginTop: 12 }}><b>{p.nombre}</b> <span className="mute">· vista previa en tiempo real, nada se guarda.</span></p>
      </div>
    </div>
  );
}
