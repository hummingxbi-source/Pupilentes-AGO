// POST /functions/v1/webhook-tiktok — avisos de TikTok Shop (ARQUITECTURA §3.3 C, Fase 6). verify_jwt = false.
//   1. Firma: HMAC-SHA256(app_secret, app_key + cuerpo crudo) en Authorization → 401 si no coincide [12].
//   2. Se responde 200 enseguida (TikTok exige < 3 s) y se procesa en segundo plano (waitUntil [22]).
//   3. Idempotencia por tts_notification_id (TikTok entrega al menos una vez, con 4 reintentos).
//   4. shop_id debe ser el de la tienda conectada; la orden se consulta a la API (el aviso no es la verdad).
// Lo que se pierda lo recupera cron-conciliar buscando las órdenes de las últimas 48 h.

import { clienteServicio } from '../_shared/auth.ts';
import { json } from '../_shared/http.ts';
import { clienteTT, configTT, registrarOrdenTT, tokenVigenteTT, verificarAviso, type ClienteTT, type ConfigTT } from '../_shared/tiktok.ts';
import type { SupabaseClient } from '../_shared/deps.ts';

interface Aviso { type?: number; tts_notification_id?: string | number; shop_id?: string | number; timestamp?: number; data?: { order_id?: string | number; order_status?: string } }

export interface Dependencias {
  admin: SupabaseClient;
  config: ConfigTT | null;
  tt: ClienteTT | null;
  enSegundoPlano: (p: Promise<unknown>) => void;
}
function dependencias(): Dependencias {
  const c = configTT();
  const er = (globalThis as { EdgeRuntime?: { waitUntil: (p: Promise<unknown>) => void } }).EdgeRuntime;
  return { admin: clienteServicio(), config: c, tt: c ? clienteTT(c) : null, enSegundoPlano: (p) => (er ? er.waitUntil(p) : void p.catch(() => {})) };
}

export async function procesar(d: Dependencias, aviso: Aviso): Promise<string> {
  const id = String(aviso.tts_notification_id ?? `${aviso.shop_id}:${aviso.data?.order_id}:${aviso.timestamp}`).slice(0, 200);
  const { data: nuevo, error } = await d.admin.rpc('registrar_evento', { p_proveedor: 'tiktok', p_id_evento: id, p_payload: aviso });
  if (error) throw new Error('registrar_evento: ' + error.message);
  if (nuevo === false) return 'repetido';
  try {
    const t = await tokenVigenteTT(d.admin, d.tt!);
    if (!t) throw new Error('sin token de TikTok (tienda no conectada o requiere autorizar)');
    if (String(aviso.shop_id) !== t.cuenta) {
      await d.admin.rpc('marcar_evento', { p_proveedor: 'tiktok', p_id_evento: id, p_error: null });
      return 'tienda_ajena';
    }
    const r = await registrarOrdenTT(d.admin, d.tt!, t, String(aviso.data?.order_id ?? ''));
    await d.admin.rpc('marcar_evento', { p_proveedor: 'tiktok', p_id_evento: id, p_error: null });
    return `movimientos:${r.movimientos}`;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('tt_aviso', msg);
    await d.admin.rpc('marcar_evento', { p_proveedor: 'tiktok', p_id_evento: id, p_error: msg });
    return 'error';
  }
}

export async function manejar(req: Request, d: Dependencias = dependencias()): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'metodo_no_permitido' }, 405);
  if (!d.config || !d.tt) return json({ error: 'tiktok_sin_configurar' }, 503);
  const crudo = await req.text();
  if (crudo.length > 16_384) return json({ error: 'demasiado_grande' }, 413);
  if (!(await verificarAviso(crudo, req.headers.get('authorization'), d.config.appKey, d.config.secreto))) {
    return json({ error: 'firma_invalida' }, 401);
  }
  let aviso: Aviso;
  try { aviso = JSON.parse(crudo); } catch { return json({ ok: true }); }
  // Solo nos interesan los avisos de órdenes (traen data.order_id); los demás se aceptan y se descartan
  if (aviso.data?.order_id == null) return json({ ok: true });
  d.enSegundoPlano(procesar(d, aviso));
  return json({ ok: true });
}
