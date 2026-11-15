// POST /functions/v1/webhook-mercadolibre — avisos de Mercado Libre (ARQUITECTURA §3.3 B, Fase 5).
// verify_jwt = false. ML no firma sus avisos; por eso [33]:
//   1. Se responde 200 ANTES de cualquier trabajo (ML exige < 500 ms; si no, reintenta 1 h y lo da por perdido).
//   2. application_id debe ser el de nuestra app y user_id el de la cuenta conectada; si no, se ignora.
//   3. La orden se consulta a la API con nuestro token: el aviso nunca se toma como verdad.
//   4. Idempotencia por _id del aviso; además mover_stock rechaza la misma orden + ítem dos veces.
// Lo que se pierda (función fría, error) lo recupera cron-conciliar buscando las órdenes recientes.

import { clienteServicio } from '../_shared/auth.ts';
import { clienteML, configML, registrarOrden, tokenVigente, type ClienteML, type ConfigML } from '../_shared/ml.ts';
import { json } from '../_shared/http.ts';
import type { SupabaseClient } from '../_shared/deps.ts';

interface Aviso { _id?: string; resource?: string; user_id?: string | number; topic?: string; application_id?: string | number; sent?: string; received?: string }

export interface Dependencias {
  admin: SupabaseClient;
  config: ConfigML | null;
  ml: ClienteML | null;
  /** Mantiene viva la instancia hasta terminar (EdgeRuntime.waitUntil [22]). */
  enSegundoPlano: (p: Promise<unknown>) => void;
}
function dependencias(): Dependencias {
  const c = configML();
  const er = (globalThis as { EdgeRuntime?: { waitUntil: (p: Promise<unknown>) => void } }).EdgeRuntime;
  return {
    admin: clienteServicio(), config: c, ml: c ? clienteML(c) : null,
    enSegundoPlano: (p) => (er ? er.waitUntil(p) : void p.catch(() => {})),
  };
}

export async function procesar(d: Dependencias, aviso: Aviso): Promise<string> {
  const id = String(aviso._id ?? `${aviso.resource}:${aviso.received ?? aviso.sent ?? ''}`).slice(0, 200);
  const { data: nuevo, error } = await d.admin.rpc('registrar_evento', { p_proveedor: 'ml', p_id_evento: id, p_payload: aviso });
  if (error) throw new Error('registrar_evento: ' + error.message);
  if (nuevo === false) return 'repetido';
  try {
    const t = await tokenVigente(d.admin, d.ml!);
    if (!t) throw new Error('sin token de ML (cuenta no conectada o requiere autorizar)');
    if (String(aviso.user_id) !== t.cuenta) {
      await d.admin.rpc('marcar_evento', { p_proveedor: 'ml', p_id_evento: id, p_error: null });
      return 'cuenta_ajena';
    }
    const orden = /^\/orders\/(\d{1,20})$/.exec(aviso.resource ?? '')?.[1];
    if (!orden) throw new Error('resource inesperado');
    const r = await registrarOrden(d.admin, d.ml!, t.token, orden);
    await d.admin.rpc('marcar_evento', { p_proveedor: 'ml', p_id_evento: id, p_error: null });
    return `movimientos:${r.movimientos}`;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('ml_aviso', msg);
    await d.admin.rpc('marcar_evento', { p_proveedor: 'ml', p_id_evento: id, p_error: msg });
    return 'error';
  }
}

export async function manejar(req: Request, d: Dependencias = dependencias()): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'metodo_no_permitido' }, 405);
  let aviso: Aviso;
  try {
    const texto = await req.text();
    if (texto.length > 8192) return json({ ok: true });
    aviso = JSON.parse(texto);
  } catch {
    return json({ ok: true });            // nada útil que procesar; 200 para que ML no reintente basura
  }
  // Solo avisos de nuestra app y del tópico de órdenes; todo lo demás se acepta y se descarta
  if (!d.config || !d.ml || String(aviso.application_id) !== d.config.appId || aviso.topic !== 'orders_v2') return json({ ok: true });
  d.enSegundoPlano(procesar(d, aviso));
  return json({ ok: true });
}
