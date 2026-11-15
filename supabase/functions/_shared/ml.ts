// Mercado Libre (ARQUITECTURA §3.3 B, Fase 5). REST sin SDK.
// Fuentes (developers.mercadolibre.com.mx):
//   OAuth: el access token dura 6 h; solo vale el ÚLTIMO refresh token generado [ML: autenticación].
//   Avisos orders_v2: { _id, resource: "/orders/ID", user_id, topic, application_id, attempts, sent, received };
//     responder 200 en < 500 ms [33].
//   Stock: PUT /items/{id} { available_quantity } o { variations: [{ id, available_quantity }] }; 0 pausa la publicación.
//     Se envían SIEMPRE todas las variaciones del ítem (las ajenas solo con su id) para no tocar las que no administramos.
//   Full (fulfillment): el stock lo administra ML; no se edita por API [ML: stock distribuido].
//   ⚠️ Cuentas con multiorigen deben usar /user-products/{id}/stock (no /items) [ML: multiorigen]: confirmar con la cuenta real.

import type { SupabaseClient } from './deps.ts';

export interface ConfigML { appId: string; secreto: string; redirect: string; api: string; auth: string }

export function configML(env: (k: string) => string | undefined = (k) => Deno.env.get(k)): ConfigML | null {
  const appId = env('ML_APP_ID'), secreto = env('ML_CLIENT_SECRET'), redirect = env('ML_REDIRECT_URI');
  if (!appId || !secreto || !redirect) return null;
  return {
    appId, secreto, redirect,
    api: (env('ML_API_URL') || 'https://api.mercadolibre.com').replace(/\/$/, ''),
    auth: (env('ML_AUTH_URL') || 'https://auth.mercadolibre.com.mx').replace(/\/$/, ''),
  };
}

export class ErrorML extends Error { constructor(readonly estado: number, mensaje: string) { super(mensaje); } }

export interface Tokens { access_token: string; refresh_token: string; expires_in: number; user_id: number | string }

export function clienteML(c: ConfigML, fetchFn: typeof fetch = fetch) {
  const pedir = async (metodo: string, ruta: string, token: string | null, cuerpo?: unknown, ms = 8000) => {
    const r = await fetchFn(`${c.api}${ruta}`, {
      method: metodo, signal: AbortSignal.timeout(ms),
      headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(cuerpo ? { 'Content-Type': 'application/json' } : {}) },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
    const datos = await r.json().catch(() => ({}));
    if (!r.ok) throw new ErrorML(r.status, `ML ${r.status}: ${(datos as { message?: string; error?: string }).message ?? (datos as { error?: string }).error ?? 'error'}`);
    return datos as Record<string, unknown>;
  };
  const token = async (params: Record<string, string>) => {
    const r = await fetchFn(`${c.api}/oauth/token`, {
      method: 'POST', signal: AbortSignal.timeout(8000),
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: c.appId, client_secret: c.secreto, ...params }),
    });
    const d = await r.json().catch(() => ({})) as Tokens & { error?: string; message?: string };
    if (!r.ok || !d.access_token || !d.refresh_token) throw new ErrorML(r.status, `ML oauth ${r.status}: ${d.error ?? d.message ?? 'sin token'}`);
    return d;
  };
  return {
    urlAutorizacion: (estado: string) =>
      `${c.auth}/authorization?response_type=code&client_id=${encodeURIComponent(c.appId)}&redirect_uri=${encodeURIComponent(c.redirect)}&state=${estado}`,
    canjearCodigo: (codigo: string) => token({ grant_type: 'authorization_code', code: codigo, redirect_uri: c.redirect }),
    refrescar: (refresh: string) => token({ grant_type: 'refresh_token', refresh_token: refresh }),
    get: (ruta: string, t: string) => pedir('GET', ruta, t),
    put: (ruta: string, t: string, cuerpo: unknown) => pedir('PUT', ruta, t, cuerpo),
  };
}
export type ClienteML = ReturnType<typeof clienteML>;

interface Guardados { cuenta: string; nombre: string | null; expira: string; estado: string; access: string; refresh: string }

/**
 * Token vigente para la cuenta conectada. Si le quedan menos de `margenMin` minutos, lo refresca;
 * como el refresh token es de un solo uso, solo refresca quien gana la concesión (ml_tomar_refresco).
 * Devuelve null si no hay cuenta conectada o si requiere volver a autorizar.
 */
export async function tokenVigente(admin: SupabaseClient, ml: ClienteML, margenMin = 10): Promise<{ token: string; cuenta: string } | null> {
  const leer = async () => (await admin.rpc('ml_leer_tokens')).data as Guardados | null;
  let g = await leer();
  if (!g || g.estado !== 'conectada' || !g.access) return null;
  if (new Date(g.expira).getTime() - Date.now() > margenMin * 60_000) return { token: g.access, cuenta: g.cuenta };

  const { data: gane } = await admin.rpc('ml_tomar_refresco');
  if (!gane) {
    // Otro proceso está refrescando: se espera un momento y se relee
    await new Promise((r) => setTimeout(r, 1500));
    g = await leer();
    return g && g.estado === 'conectada' && new Date(g.expira).getTime() > Date.now() ? { token: g.access, cuenta: g.cuenta } : null;
  }
  try {
    const t = await ml.refrescar(g.refresh);
    await admin.rpc('ml_guardar_tokens', {
      p_cuenta: String(t.user_id ?? g.cuenta), p_nombre: g.nombre, p_access: t.access_token, p_refresh: t.refresh_token,
      p_expira: new Date(Date.now() + (Number(t.expires_in) || 21600) * 1000).toISOString(),
    });
    return { token: t.access_token, cuenta: String(t.user_id ?? g.cuenta) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // 400/401 = el refresh token ya no sirve (revocado o vencido): hay que volver a autorizar
    if (e instanceof ErrorML && (e.estado === 400 || e.estado === 401)) await admin.rpc('ml_requiere_autorizar', { p_motivo: msg });
    console.error('ml_refresco', msg);
    return null;
  }
}

/** Lo que nos importa de una orden de ML. */
export function resumenOrden(o: Record<string, unknown>) {
  const items = ((o.order_items ?? []) as { item?: { id?: string; variation_id?: number | string | null }; quantity?: number }[])
    .map((x) => ({ item_id: String(x.item?.id ?? ''), variation_id: x.item?.variation_id != null ? String(x.item.variation_id) : '', cantidad: Number(x.quantity) }))
    .filter((x) => /^ML[A-Z][0-9]+$/.test(x.item_id));
  return { id: String(o.id), status: String(o.status ?? ''), items };
}

/**
 * Cuerpo del PUT de stock de un ítem. Con variaciones se mandan TODAS: las nuestras con su cantidad
 * y las demás solo con su id, para que ML no las toque.
 */
export function cuerpoStock(variacionesActuales: (number | string)[] | null, nuestras: Map<string, number>, sinVariacion?: number) {
  if (!variacionesActuales || variacionesActuales.length === 0) return { available_quantity: sinVariacion ?? 0 };
  return {
    variations: variacionesActuales.map((id) => {
      const q = nuestras.get(String(id));
      return q == null ? { id: Number(id) } : { id: Number(id), available_quantity: q };
    }),
  };
}

// ----------------------------------------------------------------------------- procesos (webhook y cron)

/** Trae una orden de ML con nuestro token y la registra (la verdad es la API, no el aviso). */
export async function registrarOrden(admin: SupabaseClient, ml: ClienteML, token: string, idOrden: string) {
  if (!/^\d{1,20}$/.test(idOrden)) throw new ErrorML(400, 'id de orden inválido');
  const o = await ml.get(`/orders/${idOrden}`, token);
  const { data, error } = await admin.rpc('ml_registrar_orden', { p_orden: resumenOrden(o) });
  if (error) throw new Error('ml_registrar_orden: ' + error.message);
  return data as { movimientos: number; sin_vincular: number; status: string };
}

/**
 * Recupera ventas recientes aunque se haya perdido el aviso (ML reintenta 1 h y luego lo da por
 * perdido [33]). Busca las órdenes actualizadas en las últimas `horas`; registrar es idempotente.
 */
export async function conciliarOrdenes(admin: SupabaseClient, ml: ClienteML, token: string, cuenta: string, horas = 48) {
  const desde = new Date(Date.now() - horas * 3600_000).toISOString();
  const r = await ml.get(`/orders/search?seller=${cuenta}&order.date_last_updated.from=${encodeURIComponent(desde)}&sort=date_desc&limit=50`, token);
  let movimientos = 0;
  for (const o of (r.results ?? []) as Record<string, unknown>[]) {
    const { data, error } = await admin.rpc('ml_registrar_orden', { p_orden: resumenOrden(o) });
    if (error) throw new Error('ml_registrar_orden: ' + error.message);
    movimientos += (data as { movimientos: number }).movimientos;
  }
  return movimientos;
}

/** Publica en ML el disponible de lo que está en la cola (solo si la sincronización está activa). */
export async function publicarStock(admin: SupabaseClient, ml: ClienteML, token: string, limite = 20) {
  const { data, error } = await admin.rpc('ml_tomar_cola', { p_limite: limite });
  if (error) throw new Error('ml_tomar_cola: ' + error.message);
  const filas = (data ?? []) as { variante_id: string; disponible: number; item: string; variacion: string | null }[];
  const porItem = new Map<string, typeof filas>();
  for (const f of filas) porItem.set(f.item, [...(porItem.get(f.item) ?? []), f]);

  const resultados: { variante_id: string; item: string; variacion: string | null; ok: boolean; publicado: number; error: string | null }[] = [];
  for (const [item, fs] of porItem) {
    try {
      let cuerpo;
      if (fs.some((f) => f.variacion)) {
        const actual = await ml.get(`/items/${item}?attributes=id,variations`, token);
        const ids = ((actual.variations ?? []) as { id: number | string }[]).map((v) => String(v.id));
        const faltan = fs.filter((f) => f.variacion && !ids.includes(f.variacion));
        for (const f of faltan) resultados.push({ ...f, ok: false, publicado: f.disponible, error: 'la variación ya no existe en ML' });
        const nuestras = new Map(fs.filter((f) => f.variacion && ids.includes(f.variacion)).map((f) => [f.variacion!, f.disponible]));
        if (nuestras.size === 0) continue;
        cuerpo = cuerpoStock(ids, nuestras);
      } else {
        cuerpo = cuerpoStock(null, new Map(), fs[0].disponible);
      }
      await ml.put(`/items/${item}`, token, cuerpo);
      for (const f of fs) if (!resultados.some((r) => r.item === f.item && r.variacion === f.variacion)) resultados.push({ ...f, ok: true, publicado: f.disponible, error: null });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      for (const f of fs) resultados.push({ ...f, ok: false, publicado: f.disponible, error: msg });
    }
  }
  if (resultados.length) {
    const { error: er } = await admin.rpc('ml_cola_resultados', { p_resultados: resultados.map((r) => ({ ...r, variacion: r.variacion ?? '' })) });
    if (er) throw new Error('ml_cola_resultados: ' + er.message);
  }
  return { publicadas: resultados.filter((r) => r.ok).length, fallidas: resultados.filter((r) => !r.ok).length };
}
