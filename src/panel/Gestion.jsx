import { useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Download, Upload, Plus, Minus, X, MessageCircle, ImagePlus } from 'lucide-react';
import { useStore } from '../lib/store';
import { FAMILIAS, GRADS, INTENSIDAD, mxn, familia, A } from '../lib/catalog';
import { Iris } from '../ui';
import { leerFilas, descargarXlsx } from '../lib/excel';
import { waTo } from './Panel';

function useEntrada(dep) {
  const ref = useRef();
  useGSAP(() => { gsap.from(ref.current.querySelectorAll('[data-in]'), { y: 24, opacity: 0, stagger: 0.04, duration: 0.8, ease: 'expo.out' }); }, { scope: ref, dependencies: dep || [] });
  return ref;
}

/* ---------------- INVENTARIO ---------------- */
export function Inventario() {
  const productos = useStore((s) => s.productos);
  const { ajustarStock, fijarStock, notificar } = useStore();
  const [fam, setFam] = useState('todos');
  const [pop, setPop] = useState(null);
  const ref = useEntrada();
  const lentes = productos.filter((p) => p.tipo === 'lente' && (fam === 'todos' || p.familia === fam));
  const total = lentes.reduce((a, p) => a + Object.values(p.stock).reduce((x, y) => x + y, 0), 0);
  const agotados = lentes.reduce((a, p) => a + GRADS.filter((g) => !(p.stock[g] > 0)).length, 0);

  const exportar = async () => {
    const rows = [['Tono', 'Familia', ...GRADS], ...productos.filter((p) => p.tipo === 'lente').map((p) => [p.nombre, familia(p.familia).nombre, ...GRADS.map((g) => p.stock[g] ?? 0)])];
    await descargarXlsx(rows, 'Inventario', `inventario-ago-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };
  const importar = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    let rows;
    try { rows = await leerFilas(f); } catch { notificar('No pude leer el archivo; usa .xlsx o .csv'); e.target.value = ''; return; }
    if (!rows.length) { notificar('El archivo está vacío'); e.target.value = ''; return; }
    const head = rows[0].map(String); let n = 0;
    rows.slice(1).forEach((r) => {
      const p = productos.find((x) => x.nombre.toLowerCase() === String(r[0] || '').toLowerCase().trim()); if (!p) return;
      head.forEach((h, i) => { const g = GRADS.find((x) => parseFloat(x) === parseFloat(h)); if (g && i > 0 && r[i] !== undefined) { fijarStock(p.id, g, Number(r[i])); n++; } });
    });
    notificar(n ? `Inventario actualizado (${n} celdas)` : 'No encontré tonos que coincidan');
    e.target.value = '';
  };

  return (
    <div ref={ref}>
      <div className="pn-h" data-in>
        <div><h1>Inventario</h1><p>Piezas por tono y graduación. Se descuenta solo con cada venta en línea.</p></div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <label className="btn sm ghost" style={{ cursor: 'pointer' }}><Upload size={15} /> Importar Excel<input type="file" accept=".xlsx,.csv" hidden onChange={importar} /></label>
          <button className="btn sm" onClick={exportar}><Download size={15} /> Exportar Excel</button>
        </div>
      </div>
      <div className="kpis" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <div className="kpi" data-in><span className="n">{total}</span><span className="l">Piezas en existencia</span></div>
        <div className="kpi" data-in><span className="n">{lentes.length}</span><span className="l">Tonos</span></div>
        <div className="kpi" data-in><span className="n">{agotados}</span><span className="l">Graduaciones agotadas</span></div>
      </div>
      <div className="frow" data-in>{[{ id: 'todos', nombre: 'Todas' }, ...FAMILIAS].map((f) => <button key={f.id} className={'chip ' + (fam === f.id ? 'on' : '')} onClick={() => setFam(f.id)}>{f.hex && <span className="dot" style={{ background: f.hex }} />}{f.nombre}</button>)}</div>
      <div className="legend" data-in><span><i style={{ background: '#F4E4DF' }} />Agotado</span><span><i style={{ background: '#F6E7C4' }} />1–2 · pedir ya</span><span><i style={{ background: '#fff' }} />3–5 · ok</span><span><i style={{ background: '#E3EEE5' }} />6+ · bien surtido</span><span>· Toca una celda para ajustar</span></div>
      <div className="inv-wrap" data-in>
        <table className="inv">
          <thead><tr><th className="nm">Tono</th>{GRADS.map((g) => <th key={g}>{g === '0.00' ? 'Plano' : g}</th>)}</tr></thead>
          <tbody>
            {FAMILIAS.filter((f) => fam === 'todos' || f.id === fam).map((f) => [
              <tr className="fam" key={f.id}><td colSpan={GRADS.length + 1}><span style={{ position: 'sticky', left: 14 }}>{f.nombre}</span></td></tr>,
              ...lentes.filter((p) => p.familia === f.id).map((p) => (
                <tr key={p.id}>
                  <td className="nm">{p.nombre}<small>{p.alias}</small></td>
                  {GRADS.map((g) => { const v = p.stock[g] ?? 0; return <td key={g}><button className={v === 0 ? 'z' : v <= 2 ? 'lo' : v <= 5 ? 'mid' : 'hi'} onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setPop({ id: p.id, g, x: Math.min(r.left, innerWidth - 220), y: r.bottom + 6 > innerHeight - 80 ? r.top - 70 : r.bottom + 6 }); }} aria-label={`${p.nombre} ${g}: ${v}`}>{v}</button></td>; })}
                </tr>)),
            ])}
          </tbody>
        </table>
      </div>
      {pop && (() => { const p = productos.find((x) => x.id === pop.id); return (
        <><div className="scrim" style={{ background: 'transparent' }} onClick={() => setPop(null)} />
          <div className="pop" style={{ left: Math.max(8, pop.x), top: pop.y }}>
            <span style={{ fontSize: 12, maxWidth: 70, lineHeight: 1.2 }}>{p.nombre.replace('Angeles N ', 'A.N. ')}<br /><span className="mono" style={{ color: 'var(--gold-l)' }}>{pop.g}</span></span>
            <button onClick={() => ajustarStock(p.id, pop.g, -1)} aria-label="Restar"><Minus size={16} /></button>
            <input inputMode="numeric" value={p.stock[pop.g] ?? 0} onChange={(e) => fijarStock(p.id, pop.g, e.target.value.replace(/\D/g, ''))} aria-label="Piezas" />
            <button onClick={() => ajustarStock(p.id, pop.g, 1)} aria-label="Sumar"><Plus size={16} /></button>
          </div></>); })()}
    </div>
  );
}

/* ---------------- CATÁLOGO ---------------- */
export function Catalogo() {
  const productos = useStore((s) => s.productos);
  const { editarProducto, nuevoProducto, notificar } = useStore();
  const [edit, setEdit] = useState(null);
  const ref = useEntrada();
  return (
    <div ref={ref}>
      <div className="pn-h" data-in>
        <div><h1>Catálogo</h1><p>Lo que cambies aquí se ve al instante en la tienda.</p></div>
        <button className="btn sm" onClick={() => setEdit({ nuevo: true, id: '', nombre: '', alias: '', familia: 'azul', intensidad: 2, desc: '', precio: 549, precioGraduado: 649, filtro: 'none', tipo: 'lente', duracion: 'Anual', visible: true, stock: Object.fromEntries(GRADS.map((g) => [g, 0])) })}><Plus size={16} /> Nuevo tono</button>
      </div>
      {FAMILIAS.map((f) => (
        <section className="panel-card" key={f.id} data-in>
          <h3><span style={{ display: 'flex', gap: 10, alignItems: 'center' }}><span className="dot" style={{ background: f.hex }} />{f.nombre}</span><small>{productos.filter((p) => p.familia === f.id && p.visible).length} visibles</small></h3>
          {productos.filter((p) => p.familia === f.id).map((p) => (
            <div className="cat-row" key={p.id}>
              <Iris p={p} glint={false} />
              <button style={{ textAlign: 'left' }} onClick={() => setEdit(p)}><b style={{ fontWeight: 500 }}>{p.nombre}</b><div className="it serif mute">{p.alias} · {INTENSIDAD[p.intensidad]}</div></button>
              <label className="pr" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className="mute">$</span><input className="inp mono" inputMode="numeric" value={p.precio} onChange={(e) => editarProducto(p.id, { precio: +e.target.value.replace(/\D/g, '') })} aria-label={`Precio ${p.nombre}`} /></label>
              <button className={'switch ' + (p.visible ? 'on' : '')} onClick={() => { editarProducto(p.id, { visible: !p.visible }); notificar(`${p.nombre} ${p.visible ? 'oculto' : 'visible'} en la tienda`); }} aria-label={`Mostrar ${p.nombre}`} />
            </div>))}
        </section>
      ))}
      {edit && <EditTono p={edit} onClose={() => setEdit(null)} onSave={(d) => { if (d.nuevo) { const { nuevo, ...rest } = d; nuevoProducto({ ...rest, id: rest.nombre.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString(36).slice(-3) }); } else editarProducto(d.id, d); notificar('Catálogo actualizado'); setEdit(null); }} />}
    </div>
  );
}

function EditTono({ p, onClose, onSave }) {
  const [d, setD] = useState(p);
  const set = (k) => (e) => setD({ ...d, [k]: e.target.value });
  const box = useRef();
  useGSAP(() => { gsap.from(box.current, { y: 40, opacity: 0, duration: 0.5, ease: 'expo.out' }); });
  const foto = (e) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => setD({ ...d, foto: r.result, fotoData: true }); r.readAsDataURL(f); };
  return (
    <div className="modal" role="dialog" aria-modal="true"><div className="scrim" onClick={onClose} />
      <div className="mbox" ref={box}>
        <button className="icon-btn" style={{ position: 'absolute', right: 12, top: 12 }} onClick={onClose} aria-label="Cerrar"><X size={20} /></button>
        <h2 className="h-s" style={{ fontSize: 26 }}>{p.nuevo ? 'Nuevo tono' : p.nombre}</h2>
        <div className="field"><label>Nombre del proveedor</label><input className="inp" value={d.nombre} onChange={set('nombre')} placeholder="Ej. Siri Gray" /></div>
        <div className="field"><label>Cómo se lo explicas a la clienta</label><input className="inp" value={d.alias} onChange={set('alias')} placeholder="Ej. Gris perla" /></div>
        <div className="field"><label>Familia</label><div className="frow">{FAMILIAS.map((f) => <button key={f.id} className={'chip ' + (d.familia === f.id ? 'on' : '')} onClick={() => setD({ ...d, familia: f.id })}><span className="dot" style={{ background: f.hex }} />{f.nombre}</button>)}</div></div>
        <div className="field"><label>Efecto</label><div className="seg" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>{[1, 2, 3].map((i) => <button key={i} className={d.intensidad === i ? 'on' : ''} onClick={() => setD({ ...d, intensidad: i })}>{INTENSIDAD[i]}</button>)}</div></div>
        <div className="two"><div className="field"><label>Precio sin graduación</label><input className="inp mono" inputMode="numeric" value={d.precio} onChange={(e) => setD({ ...d, precio: +e.target.value.replace(/\D/g, '') })} /></div><div className="field"><label>Precio graduado</label><input className="inp mono" inputMode="numeric" value={d.precioGraduado} onChange={(e) => setD({ ...d, precioGraduado: +e.target.value.replace(/\D/g, '') })} /></div></div>
        <div className="field"><label>Descripción</label><textarea className="inp" value={d.desc} onChange={set('desc')} /></div>
        <label className="upload" style={{ marginTop: 14 }}><ImagePlus size={18} />{d.foto ? 'Foto lista · cambiar' : 'Agregar foto en ojos reales'}<input type="file" accept="image/*" hidden onChange={foto} /></label>
        <button className="btn full" style={{ marginTop: 18 }} disabled={!d.nombre.trim()} onClick={() => onSave(d)}>Guardar</button>
      </div>
    </div>
  );
}

/* ---------------- CLIENTAS ---------------- */
const HIST = [['Gabriela Núcleo', 342, 'gemini-hazel', 1240], ['Rocío Bravo', 351, 'angeles-n-blue', 980], ['Tania Solís', 360, 'breeze-green', 649], ['Liliana Peña', 333, 'cloud-gray', 1347], ['Camila Ibarra', 300, 'chelsea-blue', 549]];

export function clientasDe(pedidos) {
  const m = {};
  pedidos.forEach((p) => {
    const c = (m[p.clienta] ||= { nombre: p.clienta, tel: p.tel, pedidos: 0, gasto: 0, ultima: p.fecha, tono: p.items[0]?.nombre });
    c.pedidos++; if (p.estado !== 'revision') c.gasto += p.subtotal;
    if (p.fecha > c.ultima) { c.ultima = p.fecha; c.tono = p.items[0]?.nombre; }
  });
  const hoy = Date.now();
  HIST.forEach(([n, d, t, g], i) => { m[n] = { nombre: n, tel: '55' + (60000000 + i * 1234567), pedidos: 1, gasto: g, ultima: new Date(hoy - d * 864e5).toISOString(), tono: t.replace(/-/g, ' ').replace(/\b\w/g, (x) => x.toUpperCase()) }; });
  return Object.values(m).map((c) => { const renov = new Date(new Date(c.ultima).getTime() + 335 * 864e5); return { ...c, puntos: Math.floor(c.gasto / 10), renov, dias: Math.round((renov - hoy) / 864e5) }; });
}

export function Clientas() {
  const pedidos = useStore((s) => s.pedidos);
  const clientesDb = useStore((s) => s.clientes);
  const [vista, setVista] = useState('renovar');
  const [det, setDet] = useState(null);
  const ref = useEntrada([vista]);
  const todas = useMemo(() => clientasDe(pedidos), [pedidos]);
  const lista = vista === 'renovar' ? todas.filter((c) => c.dias <= 45).sort((a, b) => a.dias - b.dias) : [...todas].sort((a, b) => b.puntos - a.puntos);
  return (
    <div ref={ref}>
      <div className="pn-h" data-in><div><h1>Clientas</h1><p>Recordatorios de renovación y puntos AGO (1 punto por cada $10).</p></div></div>
      <div className="frow" style={{ marginBottom: 18 }} data-in>
        <button className={'chip ' + (vista === 'renovar' ? 'on' : '')} onClick={() => setVista('renovar')}>Les toca renovar <span className="mono" style={{ opacity: 0.6 }}>{todas.filter((c) => c.dias <= 45).length}</span></button>
        <button className={'chip ' + (vista === 'puntos' ? 'on' : '')} onClick={() => setVista('puntos')}>Mejores clientas <span className="mono" style={{ opacity: 0.6 }}>{todas.length}</span></button>
      </div>
      <section className="panel-card" data-in>
        {lista.slice(0, 40).map((c) => (
          <div className="cl-row" key={c.nombre} onClick={() => setDet(c)}>
            <div><b style={{ fontWeight: 500 }}>{c.nombre}</b><div className="mute" style={{ fontSize: 13 }}>{c.tono} · {c.pedidos} {c.pedidos === 1 ? 'pedido' : 'pedidos'} · {vista === 'renovar' ? (c.dias < 0 ? `venció hace ${-c.dias} días` : `renueva en ${c.dias} días`) : `última ${new Date(c.ultima).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}`}</div></div>
            <span className="pts">{c.puntos} pts</span>
            <a className="btn sm ghost" onClick={(e) => e.stopPropagation()} href={waTo(c.tel, vista === 'renovar' ? `Hola ${c.nombre.split(' ')[0]} 🤍 Ya casi se cumple el año de tus ${c.tono}. ¿Te apartamos tu nuevo par? Tienes ${c.puntos} puntos AGO para usar.` : `Hola ${c.nombre.split(' ')[0]}, ¡gracias por ser clienta AGO! Tienes ${c.puntos} puntos acumulados 🤍`)} target="_blank" rel="noreferrer"><MessageCircle size={15} /> {vista === 'renovar' ? 'Recordar' : 'Escribir'}</a>
          </div>))}
        {!lista.length && <p className="mute">Nadie por ahora.</p>}
      </section>
      {det && <DetalleClienta c={det} pedidos={pedidos.filter((p) => p.tel === det.tel || p.clienta === det.nombre)} db={clientesDb[String(det.tel).slice(-10)]} onClose={() => setDet(null)} />}
    </div>
  );
}

function DetalleClienta({ c, pedidos, db, onClose }) {
  const box = useRef();
  useGSAP(() => { gsap.from(box.current, { x: 60, opacity: 0, duration: 0.5, ease: 'expo.out' }); });
  const ult = pedidos[0]; const it = ult?.items[0];
  const nivel = c.puntos >= 800 ? 'Black' : c.puntos >= 300 ? 'Dorado' : 'Esencial';
  return (
    <div className="modal" role="dialog" aria-modal="true" style={{ justifyItems: 'end', padding: 0 }}><div className="scrim" onClick={onClose} />
      <div className="mbox" ref={box} style={{ height: '100svh', maxHeight: '100svh', borderRadius: 0, width: 'min(460px,100%)' }}>
        <button className="icon-btn" style={{ position: 'absolute', right: 12, top: 12 }} onClick={onClose} aria-label="Cerrar"><X size={20} /></button>
        <p className="eyebrow">Clienta · {nivel}</p>
        <h2 className="h-s" style={{ fontSize: 30, margin: '6px 0 2px' }}>{c.nombre}</h2>
        <a className="mono mute" href={waTo(c.tel, '')} target="_blank" rel="noreferrer">{String(c.tel).replace(/(\d{2})(\d{4})(\d{4})/, '$1 $2 $3')}</a>
        <div className="kpis" style={{ gridTemplateColumns: 'repeat(3,1fr)', margin: '18px 0' }}>
          <div className="kpi"><span className="n" style={{ fontSize: 30 }}>{c.puntos}</span><span className="s">puntos</span></div>
          <div className="kpi"><span className="n" style={{ fontSize: 30 }}>{c.pedidos}</span><span className="s">pedidos</span></div>
          <div className="kpi"><span className="n" style={{ fontSize: 26 }}>{mxn(c.gasto)}</span><span className="s">compras</span></div>
        </div>
        {it && <section className="panel-card"><h3>Lo último que compró <small>{new Date(ult.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</small></h3>
          <b style={{ fontWeight: 600 }}>{it.nombre}</b><div className="mono" style={{ fontSize: 14, margin: '4px 0' }}>{it.od === '0.00' && it.oi === '0.00' ? 'Sin graduación' : `OD ${it.od} · OI ${it.oi}`}</div><p className="mute" style={{ fontSize: 13.5 }}>{ult.entrega.detalle} · {mxn(ult.total)}</p></section>}
        <section className="panel-card"><h3>Renovación</h3><p style={{ fontSize: 14.5 }}>{c.dias < 0 ? `Venció hace ${-c.dias} días` : `En ${c.dias} días`} · {c.renov.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })}</p></section>
        {db?.direcciones?.length > 0 && <section className="panel-card"><h3>Dirección guardada</h3><p style={{ fontSize: 14 }}>{db.direcciones[0].calle}, {db.direcciones[0].colonia}, {db.direcciones[0].ciudad} · CP {db.direcciones[0].cp}</p></section>}
        {pedidos.length > 1 && <section className="panel-card"><h3>Historial</h3>{pedidos.slice(0, 6).map((p) => <div key={p.folio} className="alert-row"><span>{p.items[0].nombre}<small className="mono mute" style={{ display: 'block' }}>{p.folio}</small></span><span className="mono">{mxn(p.total)}</span></div>)}</section>}
        <div style={{ display: 'grid', gap: 8, marginTop: 18 }}>
          <a className="btn" href={waTo(c.tel, `Hola ${c.nombre.split(' ')[0]} 🤍 ¿Te apartamos otro par de tus ${c.tono}? Tienes ${c.puntos} puntos AGO.`)} target="_blank" rel="noreferrer"><MessageCircle size={16} /> Ofrecer recompra</a>
        </div>
      </div>
    </div>
  );
}
