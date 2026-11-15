// Canales (Fase 5): conectar Mercado Libre, vincular publicaciones ↔ variantes y encender la sincronización.
// Todo pasa por la Edge Function panel-ml (sesión con MFA). Los tokens nunca llegan al navegador.
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Link2, Unlink, RefreshCw, Plug } from 'lucide-react';
import { useStore } from '../lib/store';
import { useSesion } from './sesion';
import { useConsulta, cargarVariantes, accionML } from './datos';
import { useEntrada, Estado } from './Panel';

const cuando = (f) => (f ? new Date(f).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : 'nunca');

export function Canales() {
  const rol = useSesion((s) => s.rol);
  const duena = rol === 'duena';
  const [params, setParams] = useSearchParams();
  const est = useConsulta(() => accionML({ accion: 'estado' }));
  const vars = useConsulta(cargarVariantes);
  const ref = useEntrada([est.cargando]);
  const [pubs, setPubs] = useState(null);
  const [ocupado, setOcupado] = useState('');
  const [error, setError] = useState('');
  const [sku, setSku] = useState({});            // fila → SKU elegido
  const [confirmar, setConfirmar] = useState(false);
  const skus = useMemo(() => new Set((vars.datos || []).map((v) => v.sku)), [vars.datos]);
  const notificar = (m) => useStore.getState().notificar(m);

  const hacer = async (etiqueta, fn) => {
    setOcupado(etiqueta); setError('');
    try { await fn(); } catch (e) { setError(e.message || 'No se pudo completar.'); } finally { setOcupado(''); }
  };

  // Regreso de la autorización de Mercado Libre (?code=…&state=…)
  useEffect(() => {
    const code = params.get('code'), state = params.get('state');
    if (!code || !state) return;
    setParams({}, { replace: true });
    hacer('callback', async () => { await accionML({ accion: 'callback', code, state }); notificar('Mercado Libre conectado.'); est.recargar(); });
  }, []);

  const cargarPubs = () => hacer('pubs', async () => {
    const r = await accionML({ accion: 'publicaciones' });
    setPubs(r.filas);
    setSku(Object.fromEntries(r.filas.map((f, i) => [i, f.vinculo?.sku || (f.sku_ml && skus.has(f.sku_ml) ? f.sku_ml : '')])));
  });

  const e = est.datos;
  return (
    <div ref={ref}>
      <div className="pn-h" data-in><div><h1>Canales</h1><p>Mercado Libre comparte el inventario con la tienda. TikTok Shop llega en la Fase 6.</p></div></div>
      <Estado {...est} />
      {error && <p className="err" role="alert">{error}</p>}
      {e && (<>
        <section className="panel-card" data-in>
          <h2 className="h-s" style={{ fontSize: 20 }}>Mercado Libre</h2>
          {e.conectada
            ? <p>Conectada con <b>{e.cuenta?.nombre || e.cuenta?.id}</b>.</p>
            : <p className={e.requiere_autorizar ? 'err' : 'mute'}>{e.requiere_autorizar ? 'Mercado Libre pidió volver a autorizar la cuenta.' : 'Sin conectar.'}</p>}
          {duena && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
            {!e.conectada && <button className="btn sm gold" disabled={!!ocupado} onClick={() => hacer('conectar', async () => { const r = await accionML({ accion: 'conectar' }); window.location.assign(r.url); })}><Plug size={15} /> {e.requiere_autorizar ? 'Volver a autorizar' : 'Conectar cuenta'}</button>}
            {e.conectada && <button className="btn sm ghost" disabled={!!ocupado} onClick={cargarPubs}><RefreshCw size={15} /> {ocupado === 'pubs' ? 'Cargando…' : 'Ver mis publicaciones'}</button>}
          </div>}
          {e.conectada && <div className="box" style={{ marginTop: 14 }}>
            <b>Publicar nuestro stock en Mercado Libre: {e.sincronizacion ? 'ACTIVO' : 'apagado'}</b>
            <p className="note">Las ventas de Mercado Libre siempre descuentan del inventario. Con esto encendido, además, cada cambio de stock aquí se publica en ML
              (disponible menos un colchón de {e.colchon} par{e.colchon === 1 ? '' : 'es'}). Las publicaciones con Full no se tocan.</p>
            {duena && !confirmar && <button className="btn sm" disabled={!!ocupado} onClick={() => (e.sincronizacion ? hacer('sync', async () => { await accionML({ accion: 'sincronizacion', activa: false }); est.recargar(); }) : setConfirmar(true))}>{e.sincronizacion ? 'Apagar' : 'Encender'}</button>}
            {confirmar && <div className="om-confirma" role="alertdialog" aria-label="Confirmar">
              <p>Al encender, <b>el stock de Mercado Libre se reemplaza por el de este panel</b> en todas las publicaciones vinculadas. Hazlo solo cuando tu inventario aquí esté al día.</p>
              <div style={{ display: 'flex', gap: 8 }}><button className="btn sm" onClick={() => { setConfirmar(false); hacer('sync', async () => { await accionML({ accion: 'sincronizacion', activa: true }); notificar('Sincronización activa.'); est.recargar(); }); }}>Sí, encender</button><button className="btn sm ghost" onClick={() => setConfirmar(false)}>No</button></div>
            </div>}
          </div>}
        </section>

        {e.vinculos?.length > 0 && <section className="panel-card" data-in>
          <h3 style={{ fontWeight: 500 }}>Vinculadas ({e.vinculos.length})</h3>
          {e.vinculos.map((v) => (
            <div className="cl-row" key={v.id}>
              <div><b style={{ fontWeight: 500 }}>{v.titulo || v.id_externo_item}</b>
                <div className="mute mono" style={{ fontSize: 12.5 }}>{v.id_externo_item}{v.id_externo_variante ? ` · var ${v.id_externo_variante}` : ''} → {v.variante?.sku} · {v.logistica === 'full' ? 'Full (no se sincroniza)' : `publicado ${v.ultimo_publicado ?? '—'} · ${cuando(v.ultimo_sync)}`}</div>
                {v.ultimo_error && <div className="err" style={{ fontSize: 12.5 }}>{v.ultimo_error}</div>}</div>
              {duena && <button className="btn sm ghost" disabled={!!ocupado} onClick={() => hacer('des', async () => { await accionML({ accion: 'desvincular', publicacion: v.id }); est.recargar(); })}><Unlink size={14} /> Quitar</button>}
            </div>))}
        </section>}

        {pubs && <section className="panel-card" data-in>
          <h3 style={{ fontWeight: 500 }}>Tus publicaciones en Mercado Libre</h3>
          <p className="note">Elige qué SKU de la tienda corresponde a cada publicación o variación. Si ML ya tiene el mismo SKU, se propone solo.</p>
          <datalist id="ml-skus">{(vars.datos || []).map((v) => <option key={v.sku} value={v.sku} />)}</datalist>
          {pubs.map((f, i) => (
            <div className="cl-row" key={`${f.item}-${f.variacion}`}>
              <div style={{ flex: 1 }}><b style={{ fontWeight: 500 }}>{f.titulo}</b>{f.nombre_variacion && <span className="mute"> · {f.nombre_variacion}</span>}
                <div className="mute mono" style={{ fontSize: 12.5 }}>{f.item}{f.variacion ? ` · var ${f.variacion}` : ''} · {f.cantidad_ml} en ML{f.logistica === 'full' ? ' · Full' : ''}{f.sku_ml ? ` · SKU ML ${f.sku_ml}` : ''}</div></div>
              {duena && <>
                <input className="inp mono" style={{ maxWidth: 230 }} list="ml-skus" placeholder="SKU de la tienda" value={sku[i] ?? ''} onChange={(ev) => setSku({ ...sku, [i]: ev.target.value.toUpperCase() })} aria-label="SKU de la tienda" />
                <button className="btn sm" disabled={!!ocupado || !skus.has(sku[i])} onClick={() => hacer('vin', async () => {
                  await accionML({ accion: 'vincular', item: f.item, variacion: f.variacion, sku: sku[i], logistica: f.logistica, titulo: [f.titulo, f.nombre_variacion].filter(Boolean).join(' · ').slice(0, 200) });
                  notificar('Vinculada.'); est.recargar();
                })}><Link2 size={14} /> {f.vinculo ? 'Cambiar' : 'Vincular'}</button>
              </>}
            </div>))}
        </section>}
      </>)}
    </div>
  );
}
