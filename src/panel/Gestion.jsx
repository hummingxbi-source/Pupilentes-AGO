import { useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Download, Upload, X, MessageCircle, ImagePlus, History, Trash2, FileSpreadsheet } from 'lucide-react';
import { useStore } from '../lib/store';
import { FAMILIAS, INTENSIDAD, mxn, A } from '../lib/catalog';
import { NEUTRO, NOMBRE_DUR } from '../lib/tienda';
import { supabase } from '../lib/supabase';
import { llamarFuncion } from '../lib/api';
import { leerFilas, descargarXlsx } from '../lib/excel';
import { comprimirWebp } from '../lib/imagenes';
import { Iris } from '../ui';
import { useSesion } from './sesion';
import { waTo, useEntrada, Estado } from './Panel';
import {
  useConsulta, cargarVariantes, cargarClientas, agrupar, GRADS_ORDEN, historial,
  previsualizarStock, aplicarStock, revisarCatalogo, aplicarCatalogo, MOTIVOS, ERRORES_STOCK,
} from './datos';

const notificar = (m) => useStore.getState().notificar(m);
const esDuena = () => useSesion.getState().rol === 'duena';
const clase = (n) => (n <= 0 ? 'z' : n <= 2 ? 'lo' : n <= 5 ? 'mid' : 'hi');
const gradTxt = (g) => (g === NEUTRO ? 'Sin grad.' : g);
const normal = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

function Modal({ titulo, onClose, children, ancho }) {
  const box = useRef();
  useGSAP(() => { gsap.fromTo(box.current, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'expo.out' }); }, { scope: box });
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={titulo}><div className="scrim" onClick={onClose} />
      <div className="mbox" ref={box} style={ancho ? { width: `min(${ancho}px, 100%)` } : undefined}>
        <button className="icon-btn" style={{ position: 'absolute', right: 12, top: 12 }} onClick={onClose} aria-label="Cerrar"><X size={20} /></button>
        <h2 className="h-s" style={{ fontSize: 24, marginBottom: 12, paddingRight: 40 }}>{titulo}</h2>
        {children}
      </div>
    </div>
  );
}

/* ================================================================ INVENTARIO */
export function Inventario() {
  const inv = useConsulta(cargarVariantes);
  const duena = useSesion((s) => s.rol === 'duena');
  const [fam, setFam] = useState('todos');
  const [dur, setDur] = useState(null);
  const [celda, setCelda] = useState(null);
  const [importe, setImporte] = useState(null);
  const ref = useEntrada([inv.cargando]);

  const variantes = inv.datos || [];
  const grupos = useMemo(() => agrupar(variantes), [variantes]);
  const lentes = grupos.filter((g) => g.tipo === 'lente');
  const accesorios = grupos.filter((g) => g.tipo === 'accesorio');
  const duraciones = [...new Set(variantes.filter((v) => v.producto.tipo === 'lente').map((v) => v.duracion))];
  const durAct = dur !== null && duraciones.includes(dur) ? dur : (duraciones.includes('anual') ? 'anual' : duraciones[0] ?? null);
  const deDur = variantes.filter((v) => v.producto.tipo === 'lente' && v.duracion === durAct);
  const grads = GRADS_ORDEN(deDur);
  const visibles = lentes.filter((g) => (fam === 'todos' || g.familia === fam) && g.variantes.some((v) => v.duracion === durAct));
  const total = variantes.reduce((a, v) => a + v.stock, 0);
  const agotadas = variantes.filter((v) => v.activo && v.disponible === 0).length;

  const exportar = async () => {
    const filas = [['sku', 'marca', 'linea', 'tono', 'duracion', 'graduacion', 'stock', 'apartado', 'precio', 'activo'],
      ...variantes.map((v) => [v.sku, v.producto.marca?.nombre, v.producto.nombre, v.tono?.color || '', v.duracion || '', v.grad === NEUTRO ? 'neutro' : v.grad, v.stock, v.stock_reservado, Number(v.precio), v.activo ? 'sí' : 'no'])];
    await descargarXlsx(filas, 'Inventario', `inventario-ago-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const importar = async (e) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    try {
      const rows = await leerFilas(f);
      const enc = (rows[0] || []).map(normal);
      const iSku = enc.indexOf('sku'), iStock = enc.indexOf('stock');
      if (iSku < 0 || iStock < 0) { notificar('El Excel necesita las columnas "sku" y "stock" (usa Exportar como plantilla).'); return; }
      const malas = [];
      const filas = rows.slice(1).filter((r) => String(r[iSku] ?? '').trim()).map((r, i) => {
        const n = Number(r[iStock]);
        if (!Number.isInteger(n) || n < 0) malas.push(`fila ${i + 2}: stock "${r[iStock]}" no es un entero ≥ 0`);
        return { sku: String(r[iSku]).trim().toUpperCase(), nuevo: n };
      });
      if (malas.length) { setImporte({ errorArchivo: malas }); return; }
      if (!filas.length) { notificar('El archivo no trae filas.'); return; }
      setImporte({ archivo: f.name, cargando: true });
      setImporte({ archivo: f.name, ...(await previsualizarStock(filas)) });
    } catch (err) {
      setImporte({ errorArchivo: [err.mensaje || err.message || 'No se pudo leer el archivo.'] });
    }
  };

  return (
    <div ref={ref}>
      <div className="pn-h" data-in>
        <div><h1>Inventario</h1><p>Pares por tono y graduación. Las ventas en línea se descuentan solas; aquí ajustas conteos y devoluciones.</p></div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {duena && <label className="btn sm ghost" style={{ cursor: 'pointer' }}><Upload size={15} /> Importar Excel<input type="file" accept=".xlsx,.csv" hidden onChange={importar} /></label>}
          <button className="btn sm" onClick={exportar} disabled={!variantes.length}><Download size={15} /> Exportar Excel</button>
        </div>
      </div>
      <div className="kpis" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <div className="kpi" data-in><span className="n">{total}</span><span className="l">Pares en existencia</span></div>
        <div className="kpi" data-in><span className="n">{lentes.length}</span><span className="l">Tonos</span></div>
        <div className="kpi" data-in><span className="n">{agotadas}</span><span className="l">Variantes agotadas</span></div>
      </div>
      <Estado {...inv} />
      <div className="frow" data-in>
        {[{ id: 'todos', nombre: 'Todas' }, ...FAMILIAS].map((f) => <button key={f.id} className={'chip ' + (fam === f.id ? 'on' : '')} onClick={() => setFam(f.id)}>{f.hex && <span className="dot" style={{ background: f.hex }} />}{f.nombre}</button>)}
        {duraciones.length > 1 && <span className="fsel" style={{ marginLeft: 4 }}>Duración<select value={durAct ?? ''} onChange={(e) => setDur(e.target.value || null)}>{duraciones.map((d) => <option key={d ?? ''} value={d ?? ''}>{d ? NOMBRE_DUR[d] : '—'}</option>)}</select></span>}
      </div>
      <div className="legend" data-in><span><i style={{ background: '#F4E4DF' }} />Agotado</span><span><i style={{ background: '#F6E7C4' }} />1–2 · pedir ya</span><span><i style={{ background: '#fff' }} />3–5 · ok</span><span><i style={{ background: '#E3EEE5' }} />6+ · bien surtido</span><span>· El número es el disponible (sin lo apartado). Toca una celda para ver o ajustar.</span></div>
      <div className="inv-wrap" data-in>
        <table className="inv">
          <thead><tr><th className="nm">Tono</th>{grads.map((g) => <th key={g}>{g === NEUTRO ? 'Plano' : g}</th>)}</tr></thead>
          <tbody>
            {FAMILIAS.filter((f) => fam === 'todos' || f.id === fam).map((f) => {
              const filas = visibles.filter((g) => g.familia === f.id);
              if (!filas.length) return null;
              return [
                <tr className="fam" key={f.id}><td colSpan={grads.length + 1}><span style={{ position: 'sticky', left: 14 }}>{f.nombre}</span></td></tr>,
                ...filas.map((g) => (
                  <tr key={g.clave} style={{ opacity: g.activo ? 1 : 0.5 }}>
                    <td className="nm">{g.nombre}<small>{g.alias}</small></td>
                    {grads.map((gr) => {
                      const v = g.variantes.find((x) => x.duracion === durAct && x.grad === gr);
                      if (!v) return <td key={gr} />;
                      return <td key={gr}><button className={clase(v.disponible)} title={`${v.sku} · stock ${v.stock}${v.stock_reservado ? ` · ${v.stock_reservado} apartados` : ''}`} onClick={() => setCelda({ v, g })}>{v.disponible}{v.stock_reservado ? '*' : ''}</button></td>;
                    })}
                  </tr>)),
              ];
            })}
          </tbody>
        </table>
      </div>
      {accesorios.length > 0 && (
        <section className="panel-card" data-in style={{ marginTop: 18 }}>
          <h3>Accesorios</h3>
          {accesorios.map((g) => { const v = g.variantes[0]; return (
            <div className="alert-row" key={g.clave}><span>{g.nombre}<small className="mono mute" style={{ display: 'block' }}>{v.sku}</small></span>
              <button className={'mono inv-btn ' + clase(v.disponible)} onClick={() => setCelda({ v, g })}>{v.disponible} disponibles</button></div>); })}
        </section>
      )}
      {celda && <AjusteCelda {...celda} duena={duena} onClose={() => setCelda(null)} onListo={() => { setCelda(null); inv.recargar(); }} />}
      {importe && <ImportarStock datos={importe} onClose={() => setImporte(null)} onListo={() => { setImporte(null); inv.recargar(); }} />}
    </div>
  );
}

function AjusteCelda({ v, g, duena, onClose, onListo }) {
  const [nuevo, setNuevo] = useState(String(v.stock));
  const [motivo, setMotivo] = useState('ajuste');
  const [nota, setNota] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [hist, setHist] = useState(null);
  const guardar = async () => {
    const n = Number(nuevo);
    if (!Number.isInteger(n) || n < 0) { setError('Escribe un número entero ≥ 0.'); return; }
    if (n === v.stock) { onClose(); return; }
    setEnviando(true); setError(null);
    try {
      await aplicarStock(crypto.randomUUID(), [{ sku: v.sku, nuevo: n, esperado: v.stock }], motivo, nota);
      notificar(`${v.sku}: ${v.stock} → ${n}`);
      onListo();
    } catch (e) {
      setError(e.codigo === 'conflicto' ? 'El stock cambió mientras tanto (hubo una venta o ajuste). Cierra y vuelve a abrir la celda.' : e.message);
      setEnviando(false);
    }
  };
  const verHistorial = async () => setHist(await historial(v.id));
  return (
    <Modal titulo={`${g.nombre} · ${gradTxt(v.grad)}`} onClose={onClose}>
      <p className="mono mute" style={{ fontSize: 13 }}>{v.sku}{v.duracion ? ` · ${NOMBRE_DUR[v.duracion]}` : ''}</p>
      <div className="kpis" style={{ gridTemplateColumns: 'repeat(3,1fr)', margin: '12px 0' }}>
        <div className="kpi"><span className="n" style={{ fontSize: 28 }}>{v.stock}</span><span className="s">en existencia</span></div>
        <div className="kpi"><span className="n" style={{ fontSize: 28 }}>{v.stock_reservado}</span><span className="s">apartados</span></div>
        <div className="kpi"><span className="n" style={{ fontSize: 28 }}>{v.disponible}</span><span className="s">disponibles</span></div>
      </div>
      {duena ? (<>
        <div className="two">
          <div className="field"><label htmlFor="nuevo">Pares contados</label><input id="nuevo" className="inp mono" inputMode="numeric" value={nuevo} onChange={(e) => setNuevo(e.target.value.replace(/\D/g, ''))} /></div>
          <div className="field"><label htmlFor="motivo">Motivo</label><select id="motivo" className="inp" value={motivo} onChange={(e) => setMotivo(e.target.value)}>{Object.entries(MOTIVOS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
        </div>
        <div className="field"><label htmlFor="nota">Nota (opcional)</label><input id="nota" className="inp" maxLength={300} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej. conteo del sábado" /></div>
        {error && <p className="err" role="alert">{error}</p>}
        <button className="btn full" style={{ marginTop: 12 }} disabled={enviando} onClick={guardar}>{enviando ? 'Guardando…' : 'Guardar ajuste'}</button>
      </>) : <p className="mute">Solo la dueña puede ajustar el stock.</p>}
      <button className="btn sm ghost" style={{ marginTop: 12 }} onClick={verHistorial}><History size={15} /> Historial</button>
      {hist && (hist.length ? hist.map((m, i) => (
        <div className="alert-row" key={i}><span>{MOTIVOS[m.motivo] || m.motivo}<small className="mute" style={{ display: 'block' }}>{new Date(m.creado_en).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })} · {m.canal || '—'}</small></span><b className="mono" style={{ color: m.delta < 0 ? 'var(--bad)' : 'inherit' }}>{m.delta > 0 ? '+' : ''}{m.delta}</b></div>
      )) : <p className="mute">Sin movimientos.</p>)}
    </Modal>
  );
}

function ImportarStock({ datos, onClose, onListo }) {
  const [motivo, setMotivo] = useState('conciliacion');
  const [enviando, setEnviando] = useState(false);
  const [problemas, setProblemas] = useState(null);
  if (datos.errorArchivo) return <Modal titulo="No se pudo usar el archivo" onClose={onClose}><ul>{datos.errorArchivo.map((e) => <li key={e}>{e}</li>)}</ul><p className="mute" style={{ marginTop: 10 }}>No se cambió nada.</p></Modal>;
  if (datos.cargando) return <Modal titulo="Revisando el archivo…" onClose={onClose}><p className="mute" role="status">Comparando con el inventario actual…</p></Modal>;
  const cambios = datos.filas.filter((f) => !f.error && f.cambio);
  const errores = datos.filas.filter((f) => f.error);
  const aplicar = async () => {
    setEnviando(true);
    try {
      const r = await aplicarStock(datos.lote, cambios.map((f) => ({ sku: f.sku, nuevo: f.nuevo, esperado: f.actual })), motivo, `Excel: ${datos.archivo}`);
      notificar(`Inventario actualizado: ${r.aplicadas} variantes`);
      onListo();
    } catch (e) { setProblemas(e.codigo === 'conflicto' ? 'Algo cambió mientras revisabas. Vuelve a importar el archivo para ver los números al día.' : e.message); setEnviando(false); }
  };
  return (
    <Modal titulo={`Vista previa · ${datos.archivo}`} onClose={onClose} ancho={640}>
      <p>{cambios.length} cambios · {datos.filas.length - cambios.length - errores.length} sin cambio · <b style={{ color: errores.length ? 'var(--bad)' : 'inherit' }}>{errores.length} con problema</b></p>
      {errores.length > 0 && <p className="err" role="alert">Corrige las filas con problema en tu Excel y vuelve a importarlo. Mientras haya errores no se aplica nada.</p>}
      <div style={{ maxHeight: 340, overflow: 'auto', margin: '12px 0' }}>
        <table className="tabla-prev"><thead><tr><th>SKU</th><th>Antes</th><th>Después</th><th /></tr></thead>
          <tbody>{[...errores, ...cambios].map((f) => (
            <tr key={f.sku} className={f.error ? 'mal' : ''}><td className="mono">{f.sku}</td><td>{f.actual ?? '—'}</td><td>{f.nuevo ?? '—'}</td><td>{f.error ? ERRORES_STOCK[f.error] || f.error : (f.cambio > 0 ? `+${f.cambio}` : f.cambio)}</td></tr>))}
          </tbody></table>
      </div>
      <div className="field"><label htmlFor="motivo-imp">Motivo</label><select id="motivo-imp" className="inp" value={motivo} onChange={(e) => setMotivo(e.target.value)}>{Object.entries(MOTIVOS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
      {problemas && <p className="err" role="alert">{problemas}</p>}
      <button className="btn full" style={{ marginTop: 12 }} disabled={enviando || errores.length > 0 || !cambios.length} onClick={aplicar}>{enviando ? 'Aplicando…' : `Aplicar ${cambios.length} cambios`}</button>
    </Modal>
  );
}

/* ================================================================ CATÁLOGO */
export function Catalogo() {
  const inv = useConsulta(cargarVariantes);
  const duena = useSesion((s) => s.rol === 'duena');
  const [edit, setEdit] = useState(null);
  const [importe, setImporte] = useState(null);
  const ref = useEntrada([inv.cargando]);
  const grupos = useMemo(() => agrupar(inv.datos || []), [inv.datos]);

  const precios = (g) => {
    const m = new Map();
    for (const v of g.variantes) { const k = v.duracion ?? ''; if (!m.has(k)) m.set(k, new Set()); m.get(k).add(Number(v.precio)); }
    return [...m.entries()].map(([d, s]) => ({ d: d || null, precio: Math.min(...s), varios: s.size > 1 }));
  };
  const cambiarPrecio = async (g, d, valor) => {
    const n = Number(valor);
    if (!(n > 0)) { notificar('Precio inválido'); return; }
    let q = supabase.from('variantes').update({ precio: n }).eq('producto_id', g.producto.id);
    q = g.tono ? q.eq('tono_id', g.tono.id) : q;
    q = d ? q.eq('duracion', d) : q.is('duracion', null);
    const { error } = await q;
    if (error) notificar('No se pudo guardar el precio'); else { notificar(`${g.nombre}: ${mxn(n)}`); inv.recargar(); }
  };
  const alternar = async (g) => {
    const { error } = g.tono
      ? await supabase.from('tonos').update({ activo: !g.activo }).eq('id', g.tono.id)
      : await supabase.from('productos').update({ activo: !g.activo }).eq('id', g.producto.id);
    if (error) notificar('No se pudo cambiar'); else { notificar(`${g.nombre} ${g.activo ? 'oculto' : 'visible'} en la tienda`); inv.recargar(); }
  };
  const importar = async (e) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    let filas;
    try { filas = (await leerFilas(f)).map((r) => r.map((c) => (c instanceof Date ? c.toISOString() : c))); }
    catch { setImporte({ archivo: f.name, errores: ['No se pudo leer el archivo; usa .xlsx o .csv.'] }); return; }
    setImporte({ archivo: f.name, filas, cargando: true });
    try { setImporte({ archivo: f.name, filas, resumen: (await revisarCatalogo(filas)).resumen }); }
    catch (err) { setImporte({ archivo: f.name, errores: err.datos?.errores || [err.message] }); }
  };

  return (
    <div ref={ref}>
      <div className="pn-h" data-in>
        <div><h1>Catálogo</h1><p>Lo que cambies aquí se ve en la tienda (los visitantes lo ven en minutos por la caché).</p></div>
        {duena && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a className="btn sm ghost" href={A('plantillas/catalogo.xlsx')} download><FileSpreadsheet size={15} /> Plantilla</a>
          <label className="btn sm" style={{ cursor: 'pointer' }}><Upload size={15} /> Agregar o actualizar con plantilla<input type="file" accept=".xlsx,.csv" hidden onChange={importar} /></label>
        </div>}
      </div>
      <Estado {...inv} />
      {[...FAMILIAS, { id: null, nombre: 'Accesorios' }].map((f) => {
        const lista = grupos.filter((g) => (f.id ? g.tipo === 'lente' && g.familia === f.id : g.tipo === 'accesorio'));
        if (!lista.length) return null;
        return (
          <section className="panel-card" key={f.nombre} data-in>
            <h3><span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>{f.hex && <span className="dot" style={{ background: f.hex }} />}{f.nombre}</span><small>{lista.filter((g) => g.activo).length} visibles</small></h3>
            {lista.map((g) => (
              <div className="cat-row" key={g.clave}>
                {g.tipo === 'lente' ? <Iris p={g} glint={false} /> : <div className="iris" style={{ background: 'var(--sand)', width: 44 }} />}
                <button style={{ textAlign: 'left' }} onClick={() => setEdit(g)}><b style={{ fontWeight: 500 }}>{g.nombre}</b><div className="it serif mute">{g.alias}{g.tipo === 'lente' ? ` · ${INTENSIDAD[g.intensidad]}` : ''}</div></button>
                <div style={{ display: 'grid', gap: 4 }}>
                  {precios(g).map(({ d, precio, varios }) => (
                    <label key={d ?? 'x'} className="pr" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="mute" style={{ fontSize: 12, minWidth: 64 }}>{d ? NOMBRE_DUR[d] : ''}{varios ? ' *' : ''} $</span>
                      <input className="inp mono" inputMode="numeric" defaultValue={precio} disabled={!duena} key={`${g.clave}-${d}-${precio}`}
                        onBlur={(e) => { if (Number(e.target.value) !== precio) cambiarPrecio(g, d, e.target.value); }}
                        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} aria-label={`Precio ${g.nombre} ${d || ''}`} />
                    </label>))}
                </div>
                <button className={'switch ' + (g.activo ? 'on' : '')} disabled={!duena} onClick={() => alternar(g)} aria-label={`Mostrar ${g.nombre} en la tienda`} />
              </div>))}
          </section>
        );
      })}
      {edit && <EditTono g={edit} duena={duena} onClose={() => setEdit(null)} onListo={() => { setEdit(null); inv.recargar(); }} />}
      {importe && <ImportarCatalogo datos={importe} onClose={() => setImporte(null)} onListo={() => { setImporte(null); inv.recargar(); }} />}
    </div>
  );
}

function ImportarCatalogo({ datos, onClose, onListo }) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const aplicar = async () => {
    setEnviando(true); setError(null);
    try { const r = await aplicarCatalogo(datos.filas); notificar(`Catálogo actualizado · ${r.aplicado?.variantes_nuevas ?? 0} variantes nuevas`); onListo(); }
    catch (e) { setError((e.datos?.errores || [e.message]).join(' · ')); setEnviando(false); }
  };
  return (
    <Modal titulo={`Plantilla · ${datos.archivo}`} onClose={onClose} ancho={600}>
      {datos.cargando && <p className="mute" role="status">Revisando…</p>}
      {datos.errores && (<><p className="err" role="alert">La plantilla tiene errores; no se aplicó nada:</p><ul style={{ maxHeight: 300, overflow: 'auto' }}>{datos.errores.map((e) => <li key={e}>{e}</li>)}</ul></>)}
      {datos.resumen && (<>
        <p>{datos.resumen}</p>
        <p className="mute" style={{ fontSize: 13, margin: '8px 0' }}>Se crean los tonos y variantes nuevos y se actualizan nombres, textos y precios de los que ya existen. El stock solo se carga la primera vez; los conteos después se ajustan en Inventario.</p>
        {error && <p className="err" role="alert">{error}</p>}
        <button className="btn full" disabled={enviando} onClick={aplicar}>{enviando ? 'Aplicando…' : 'Aplicar al catálogo'}</button>
      </>)}
    </Modal>
  );
}

function EditTono({ g, duena, onClose, onListo }) {
  const t = g.tono;
  const [d, setD] = useState(t ? { alias: t.alias || '', descripcion: t.descripcion || '', familia: t.familia, intensidad: t.intensidad || 1, destacado: !!t.destacado }
    : { alias: g.producto.alias || '', descripcion: g.producto.descripcion || '' });
  const [enviando, setEnviando] = useState(false);
  const fotos = useConsulta(async () => {
    let q = supabase.from('imagenes').select('id, url, alt, orden').eq('producto_id', g.producto.id).order('orden');
    q = t ? q.eq('tono_id', t.id) : q.is('tono_id', null);
    const { data, error } = await q; if (error) throw new Error(error.message); return data;
  }, [g.clave]);
  const [subiendo, setSubiendo] = useState(null);
  const guardar = async () => {
    setEnviando(true);
    const { error } = t ? await supabase.from('tonos').update(d).eq('id', t.id) : await supabase.from('productos').update(d).eq('id', g.producto.id);
    if (error) { notificar('No se pudo guardar'); setEnviando(false); return; }
    notificar(`${g.nombre} actualizado`); onListo();
  };
  const subirFoto = async (e) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    setSubiendo('Preparando la foto…');
    try {
      const versiones = await comprimirWebp(f);
      const firma = await llamarFuncion('r2-firmar', { cuerpo: { accion: 'firmar' } });
      setSubiendo('Subiendo…');
      for (const s of firma.subidas) {
        const blob = versiones.find((v) => v.ancho === s.ancho).blob;
        const r = await fetch(s.url, { method: 'PUT', body: blob, headers: { 'Content-Type': 'image/webp' } });
        if (!r.ok) throw new Error(`La subida falló (${r.status})`);
      }
      setSubiendo('Revisando…');
      const { url } = await llamarFuncion('r2-firmar', { cuerpo: { accion: 'verificar', id: firma.id } });
      const { error } = await supabase.from('imagenes').insert({ producto_id: g.producto.id, tono_id: t?.id ?? null, url, alt: g.nombre, orden: (fotos.datos?.length || 0) });
      if (error) throw new Error(error.message);
      notificar('Foto agregada'); setSubiendo(null); fotos.recargar();
    } catch (err) {
      setSubiendo(null);
      notificar(err.codigo === 'r2_sin_configurar' ? 'Las fotos se activan cuando exista R2. Mientras, usa el importador.' : err.message);
    }
  };
  const quitarFoto = async (id) => {
    const { error } = await supabase.from('imagenes').delete().eq('id', id);
    if (error) notificar('No se pudo quitar'); else fotos.recargar();
  };
  const set = (k) => (e) => setD({ ...d, [k]: e.target.value });
  return (
    <Modal titulo={g.nombre} onClose={onClose}>
      <p className="mono mute" style={{ fontSize: 13, marginTop: -6 }}>{g.producto.marca?.nombre} · {g.variantes.length} variantes</p>
      <fieldset disabled={!duena} style={{ border: 0, padding: 0, margin: 0 }}>
        <div className="field"><label htmlFor="alias">Cómo se lo explicas a la clienta</label><input id="alias" className="inp" maxLength={120} value={d.alias} onChange={set('alias')} /></div>
        {t && <>
          <div className="field"><label>Familia</label><div className="frow">{FAMILIAS.map((f) => <button type="button" key={f.id} className={'chip ' + (d.familia === f.id ? 'on' : '')} onClick={() => setD({ ...d, familia: f.id })}><span className="dot" style={{ background: f.hex }} />{f.nombre}</button>)}</div></div>
          <div className="field"><label>Efecto</label><div className="seg" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>{[1, 2, 3].map((i) => <button type="button" key={i} className={d.intensidad === i ? 'on' : ''} onClick={() => setD({ ...d, intensidad: i })}>{INTENSIDAD[i]}</button>)}</div></div>
          <label className="check" style={{ marginTop: 10 }}><input type="checkbox" checked={d.destacado} onChange={(e) => setD({ ...d, destacado: e.target.checked })} /> Marcar como “Más vendido”</label>
        </>}
        <div className="field"><label htmlFor="desc">Descripción</label><textarea id="desc" className="inp" maxLength={2000} value={d.descripcion} onChange={set('descripcion')} /></div>
      </fieldset>
      <div className="field"><label>Fotos</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(fotos.datos || []).map((i) => (
            <div key={i.id} style={{ position: 'relative' }}><img src={A(i.url)} alt={i.alt || ''} style={{ width: 84, height: 84, objectFit: 'cover', borderRadius: 8 }} />
              {duena && <button className="icon-btn" style={{ position: 'absolute', top: 2, right: 2, background: 'var(--paper)' }} onClick={() => quitarFoto(i.id)} aria-label="Quitar foto"><Trash2 size={14} /></button>}</div>))}
          {!fotos.cargando && !fotos.datos?.length && <span className="mute" style={{ fontSize: 13 }}>Sin fotos.</span>}
        </div>
        {duena && <label className="upload" style={{ marginTop: 10 }}><ImagePlus size={18} />{subiendo || 'Agregar foto'}<input type="file" accept="image/*" hidden disabled={!!subiendo} onChange={subirFoto} /></label>}
      </div>
      {duena && <button className="btn full" style={{ marginTop: 18 }} disabled={enviando} onClick={guardar}>{enviando ? 'Guardando…' : 'Guardar'}</button>}
    </Modal>
  );
}

/* ================================================================ CLIENTAS */
export function Clientas() {
  const cl = useConsulta(cargarClientas);
  const ref = useEntrada([cl.cargando]);
  const lista = (cl.datos || []).map((c) => {
    const pagados = (c.pedidos || []).filter((p) => p.pago_estado === 'aprobado');
    return { ...c, n: pagados.length, gasto: pagados.reduce((a, p) => a + Number(p.total), 0), ultima: pagados.map((p) => p.creado_en).sort().at(-1) };
  }).sort((a, b) => b.gasto - a.gasto);
  return (
    <div ref={ref}>
      <div className="pn-h" data-in><div><h1>Clientas</h1><p>Quiénes te compran. Los puntos y la cuenta de clienta llegan en la Fase 7.</p></div></div>
      <Estado {...cl} />
      <section className="panel-card" data-in>
        {lista.map((c) => (
          <div className="cl-row" key={c.id}>
            <div><b style={{ fontWeight: 500 }}>{c.nombre || 'Sin nombre'}</b><div className="mute" style={{ fontSize: 13 }}>{c.n} {c.n === 1 ? 'compra' : 'compras'} · {mxn(c.gasto)}{c.ultima ? ` · última ${new Date(c.ultima).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}` : ''}</div></div>
            {c.telefono && <a className="btn sm ghost" href={waTo(c.telefono, `Hola ${(c.nombre || '').split(' ')[0]} 🤍`)} target="_blank" rel="noreferrer"><MessageCircle size={15} /> WhatsApp</a>}
          </div>))}
        {!cl.cargando && !lista.length && <p className="mute">Aún no hay clientas registradas. Aparecerán con las primeras compras (Fase 3).</p>}
      </section>
    </div>
  );
}
