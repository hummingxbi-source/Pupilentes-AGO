// TikTok Shop (ARQUITECTURA §3.3 C, Fase 6). Partner API versión 202309, sin SDK.
// Fuentes: TikTok Shop Partner Center (docs de 202309) vía [12] y guías de integradores:
//   · Firma de PETICIONES: HMAC-SHA256(app_secret, app_secret + path + params ordenados (clave+valor, sin
//     `sign` ni `access_token`) + cuerpo + app_secret) en hex; token en la cabecera x-tts-access-token.
//   · Firma de AVISOS: HMAC-SHA256(app_secret, app_key + cuerpo crudo) en hex, en la cabecera Authorization.
//     Entrega al menos una vez, 4 reintentos; deduplicar por tts_notification_id; responder 200 en < 3 s [12].
//   · Inventario: POST /product/202309/products/{product_id}/inventory/update { skus: [{ id, inventory: [{ quantity, warehouse_id? }] }] }.
//   · Orden: GET /order/202309/orders?ids=…; búsqueda: POST /order/202309/orders/search.
//   · Tienda autorizada (shop_cipher): GET /authorization/202309/shops.
// ⚠️ Verificar con la app real (sandbox de Partner Center): algoritmo exacto de la firma, URL de autorización
//    para México y si las líneas de la orden traen `quantity` (aquí: una línea = una pieza si no la traen).

import { igualesSeguro } from './http.ts';
import type { SupabaseClient } from './deps.ts';

export interface ConfigTT { appKey: string; secreto: string; servicio: string; api: string; authApi: string; authUrl: string }

export function configTT(env: (k: string) => string | undefined = (k) => Deno.env.get(k)): ConfigTT | null {
  const appKey = env('TT_APP_KEY'), secreto = env('TT_APP_SECRET'), servicio = env('TT_SERVICE_ID');
  if (!appKey || !secreto || !servicio) return null;
  const sin = (u: string) => u.replace(/\/$/, '');
  return {
    appKey, secreto, servicio,
    api: sin(env('TT_API_URL') || 'https://open-api.tiktokglobalshop.com'),
    authApi: sin(env('TT_AUTH_API_URL') || 'https://auth.tiktok-shops.com'),
    authUrl: sin(env('TT_AUTH_URL') || 'https://services.tiktokshop.com/open/authorize'),
  };
}

export class ErrorTT extends Error { constructor(readonly estado: number, readonly codigo: number | null, mensaje: string) { super(mensaje); } }

const enc = new TextEncoder();
async function hmacHex(secreto: string, texto: string) {
  const k = await crypto.subtle.importKey('raw', enc.encode(secreto), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return [...new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(texto)))].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Firma de una petición a la Partner API. */
export function firmar(secreto: string, ruta: string, params: Record<string, string>, cuerpo: string) {
  const base = Object.keys(params).filter((k) => k !== 'sign' && k !== 'access_token').sort().map((k) => k + params[k]).join('');
  return hmacHex(secreto, secreto + ruta + base + cuerpo + secreto);
}

/** Verifica la firma de un aviso (falla cerrado). */
export async function verificarAviso(cuerpoCrudo: string, autorizacion: string | null, appKey: string, secreto: string) {
  const firma = (autorizacion ?? '').trim();
  if (!/^[0-9a-f]{64}$/.test(firma)) return false;
  return igualesSeguro(await hmacHex(secreto, appKey + cuerpoCrudo), firma);
}

export interface TokensTT { access_token: string; access_token_expire_in: number; refresh_token: string; open_id?: string; seller_name?: string }

export function clienteTT(c: ConfigTT, fetchFn: typeof fetch = fetch) {
  const pedir = async (metodo: 'GET' | 'POST', ruta: string, token: string, cipher: string | null, query: Record<string, string> = {}, cuerpo?: unknown) => {
    const params: Record<string, string> = { app_key: c.appKey, timestamp: String(Math.floor(Date.now() / 1000)), ...query };
    if (cipher) params.shop_cipher = cipher;
    const texto = cuerpo === undefined ? '' : JSON.stringify(cuerpo);
    params.sign = await firmar(c.secreto, ruta, params, texto);
    const r = await fetchFn(`${c.api}${ruta}?${new URLSearchParams(params)}`, {
      method: metodo, signal: AbortSignal.timeout(8000), body: cuerpo === undefined ? undefined : texto,
      headers: { 'x-tts-access-token': token, 'Content-Type': 'application/json' },
    });
    const d = await r.json().catch(() => ({})) as { code?: number; message?: string; data?: Record<string, unknown> };
    if (!r.ok || d.code !== 0) throw new ErrorTT(r.status, d.code ?? null, `TikTok ${r.status}/${d.code}: ${d.message ?? 'error'}`);
    return d.data ?? {};
  };
  const token = async (ruta: string, params: Record<string, string>) => {
    const r = await fetchFn(`${c.authApi}${ruta}?${new URLSearchParams({ app_key: c.appKey, app_secret: c.secreto, ...params })}`, { signal: AbortSignal.timeout(8000) });
    const d = await r.json().catch(() => ({})) as { code?: number; message?: string; data?: TokensTT };
    if (!r.ok || d.code !== 0 || !d.data?.access_token) throw new ErrorTT(r.status, d.code ?? null, `TikTok oauth ${r.status}/${d.code}: ${d.message ?? 'sin token'}`);
    return d.data;
  };
  return {
    urlAutorizacion: (estado: string) => `${c.authUrl}?service_id=${encodeURIComponent(c.servicio)}&state=${estado}`,
    canjearCodigo: (codigo: string) => token('/api/v2/token/get', { auth_code: codigo, grant_type: 'authorized_code' }),
    refrescar: (refresh: string) => token('/api/v2/token/refresh', { refresh_token: refresh, grant_type: 'refresh_token' }),
    get: (ruta: string, t: string, cipher: string | null, query?: Record<string, string>) => pedir('GET', ruta, t, cipher, query),
    post: (ruta: string, t: string, cipher: string | null, cuerpo: unknown, query?: Record<string, string>) => pedir('POST', ruta, t, cipher, query, cuerpo),
  };
}
export type ClienteTT = ReturnType<typeof clienteTT>;

interface GuardadosTT { cuenta: string; nombre: string | null; expira: string; estado: string; access: string; refresh: string; cipher: string }

/** Token vigente (igual que ML: refresca con margen y un solo proceso a la vez). */
export async function tokenVigenteTT(admin: SupabaseClient, tt: ClienteTT, margenMin = 60): Promise<{ token: string; cuenta: string; cipher: string } | null> {
  const leer = async () => (await admin.rpc('tt_leer_tokens')).data as GuardadosTT | null;
  let g = await leer();
  if (!g || g.estado !== 'conectada' || !g.access) return null;
  if (new Date(g.expira).getTime() - Date.now() > margenMin * 60_000) return { token: g.access, cuenta: g.cuenta, cipher: g.cipher };
  const { data: gane } = await admin.rpc('tt_tomar_refresco');
  if (!gane) {
    await new Promise((r) => setTimeout(r, 1500));
    g = await leer();
    return g && g.estado === 'conectada' && new Date(g.expira).getTime() > Date.now() ? { token: g.access, cuenta: g.cuenta, cipher: g.cipher } : null;
  }
  try {
    const t = await tt.refrescar(g.refresh);
    await admin.rpc('tt_guardar_tokens', {
      p_cuenta: g.cuenta, p_nombre: g.nombre, p_access: t.access_token, p_refresh: t.refresh_token,
      p_expira: new Date(Number(t.access_token_expire_in) * 1000).toISOString(), p_cipher: g.cipher,
    });
    return { token: t.access_token, cuenta: g.cuenta, cipher: g.cipher };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Rechazo de TikTok (no un fallo de red ni un 5xx): el refresh token ya no sirve → volver a autorizar
    if (e instanceof ErrorTT && e.estado < 500) await admin.rpc('tt_requiere_autorizar', { p_motivo: msg });
    console.error('tt_refresco', msg);
    return null;
  }
}

// Estados de TikTok: pagada desde ON_HOLD / AWAITING_SHIPMENT en adelante; UNPAID no mueve stock aquí.
const PAGADA = new Set(['ON_HOLD', 'AWAITING_SHIPMENT', 'PARTIALLY_SHIPPING', 'AWAITING_COLLECTION', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED']);

/** Orden de TikTok → lo que registra tt_registrar_orden (una entrada por producto + SKU). */
export function resumenOrdenTT(o: Record<string, unknown>) {
  const estado = String(o.status ?? o.order_status ?? '');
  const suma = new Map<string, { item_id: string; variation_id: string; cantidad: number }>();
  for (const l of (o.line_items ?? []) as { product_id?: string; sku_id?: string; quantity?: number }[]) {
    const p = String(l.product_id ?? ''), s = String(l.sku_id ?? '');
    if (!/^\d{4,30}$/.test(p) || !/^\d{4,30}$/.test(s)) continue;
    const k = `${p}:${s}`;
    const q = Number.isInteger(l.quantity) && (l.quantity as number) > 0 ? (l.quantity as number) : 1;
    suma.set(k, { item_id: p, variation_id: s, cantidad: (suma.get(k)?.cantidad ?? 0) + q });
  }
  return { id: String(o.id ?? ''), status: estado === 'CANCELLED' ? 'cancelled' : PAGADA.has(estado) ? 'paid' : 'sin_cambio', items: [...suma.values()] };
}

export async function registrarOrdenTT(admin: SupabaseClient, tt: ClienteTT, t: { token: string; cipher: string }, idOrden: string) {
  if (!/^\d{4,30}$/.test(idOrden)) throw new ErrorTT(400, null, 'id de orden inválido');
  const d = await tt.get('/order/202309/orders', t.token, t.cipher, { ids: idOrden });
  const o = ((d.orders ?? []) as Record<string, unknown>[])[0];
  if (!o) throw new ErrorTT(404, null, 'TikTok no devolvió la orden');
  const { data, error } = await admin.rpc('tt_registrar_orden', { p_orden: resumenOrdenTT(o) });
  if (error) throw new Error('tt_registrar_orden: ' + error.message);
  return data as { movimientos: number };
}

/** Recupera órdenes actualizadas en las últimas `horas` (avisos perdidos tras los 4 reintentos de TikTok). */
export async function conciliarOrdenesTT(admin: SupabaseClient, tt: ClienteTT, t: { token: string; cipher: string }, horas = 48) {
  const desde = Math.floor((Date.now() - horas * 3600_000) / 1000);
  const d = await tt.post('/order/202309/orders/search', t.token, t.cipher, { update_time_ge: desde }, { page_size: '50' });
  let movimientos = 0;
  for (const o of (d.orders ?? []) as Record<string, unknown>[]) {
    const { data, error } = await admin.rpc('tt_registrar_orden', { p_orden: resumenOrdenTT(o) });
    if (error) throw new Error('tt_registrar_orden: ' + error.message);
    movimientos += (data as { movimientos: number }).movimientos;
  }
  return movimientos;
}

/** Publica el disponible de la cola. Solo se mandan nuestros SKU de cada producto (los demás no se tocan). */
export async function publicarStockTT(admin: SupabaseClient, tt: ClienteTT, t: { token: string; cipher: string }, almacen: string | null, limite = 20) {
  const { data, error } = await admin.rpc('tt_tomar_cola', { p_limite: limite });
  if (error) throw new Error('tt_tomar_cola: ' + error.message);
  const filas = (data ?? []) as { variante_id: string; disponible: number; item: string; variacion: string }[];
  const porProducto = new Map<string, typeof filas>();
  for (const f of filas) porProducto.set(f.item, [...(porProducto.get(f.item) ?? []), f]);
  const resultados: { variante_id: string; item: string; variacion: string; ok: boolean; publicado: number; error: string | null }[] = [];
  for (const [producto, fs] of porProducto) {
    try {
      await tt.post(`/product/202309/products/${producto}/inventory/update`, t.token, t.cipher, {
        skus: fs.map((f) => ({ id: f.variacion, inventory: [{ quantity: Math.min(f.disponible, 99_998), ...(almacen ? { warehouse_id: almacen } : {}) }] })),
      });
      for (const f of fs) resultados.push({ ...f, ok: true, publicado: f.disponible, error: null });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      for (const f of fs) resultados.push({ ...f, ok: false, publicado: f.disponible, error: msg });
    }
  }
  if (resultados.length) {
    const { error: er } = await admin.rpc('tt_cola_resultados', { p_resultados: resultados });
    if (er) throw new Error('tt_cola_resultados: ' + er.message);
  }
  return { publicadas: resultados.filter((r) => r.ok).length, fallidas: resultados.filter((r) => !r.ok).length };
}
