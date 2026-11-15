// Mercado Pago Checkout Pro (ARQUITECTURA §3.3 A). Sin SDK: REST con el access token del vendedor.
// Fuentes: creación de preferencias y notificaciones en MP Developers [7][23].
//   POST /checkout/preferences   → { id, init_point }
//   GET  /v1/payments/{id}       → la verdad del pago (el aviso del webhook solo avisa)
//   POST /v1/payments/{id}/refunds (X-Idempotency-Key)
// Firma de webhooks: HMAC-SHA256 (hex) con la "clave secreta" de la app sobre
//   "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"   comparado con v1 de x-signature [23].
//   Si data.id es alfanumérico se usa en minúsculas; si falta un valor, se omite su segmento.

import { igualesSeguro } from './http.ts';

export interface ConfigMP { token: string; secretoWebhook: string; api: string }

export function configMP(env: (k: string) => string | undefined = (k) => Deno.env.get(k)): ConfigMP | null {
  const token = env('MP_ACCESS_TOKEN');
  const secretoWebhook = env('MP_WEBHOOK_SECRET');
  if (!token || !secretoWebhook) return null;
  return { token, secretoWebhook, api: (env('MP_API_URL') || 'https://api.mercadopago.com').replace(/\/$/, '') };
}

async function hmacHex(secreto: string, texto: string): Promise<string> {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(secreto), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const f = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(texto));
  return [...new Uint8Array(f)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Arma el manifiesto que firma Mercado Pago. */
export function manifiesto(dataId: string | null, requestId: string | null, ts: string): string {
  const id = dataId ? (/^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId) : null;
  return `${id ? `id:${id};` : ''}${requestId ? `request-id:${requestId};` : ''}ts:${ts};`;
}

/** Verifica x-signature. Devuelve false ante cualquier cosa rara (falla cerrado). */
export async function verificarFirma(req: Request, secreto: string, dataId: string | null, toleranciaMs = 24 * 3600_000): Promise<boolean> {
  const firma = req.headers.get('x-signature') ?? '';
  const partes = Object.fromEntries(firma.split(',').map((p) => p.split('=').map((x) => x.trim())).filter((p) => p.length === 2));
  const ts = partes.ts, v1 = partes.v1;
  if (!ts || !v1 || !/^\d{10,16}$/.test(ts) || !/^[0-9a-f]{64}$/.test(v1)) return false;
  const msTs = ts.length <= 10 ? Number(ts) * 1000 : Number(ts);
  if (Math.abs(Date.now() - msTs) > toleranciaMs) return false;   // aviso viejísimo o del futuro
  const esperado = await hmacHex(secreto, manifiesto(dataId, req.headers.get('x-request-id'), ts));
  return igualesSeguro(esperado, v1);
}

/** Firma un aviso como lo haría Mercado Pago (para pruebas y el simulador local). */
export async function firmarAviso(secreto: string, dataId: string, requestId: string, ts = String(Date.now())) {
  return { 'x-signature': `ts=${ts},v1=${await hmacHex(secreto, manifiesto(dataId, requestId, ts))}`, 'x-request-id': requestId };
}

export class ErrorMP extends Error { constructor(readonly estado: number, mensaje: string) { super(mensaje); } }

export function clienteMP(c: ConfigMP, fetchFn: typeof fetch = fetch) {
  const llamar = async (ruta: string, init: RequestInit = {}) => {
    const r = await fetchFn(`${c.api}${ruta}`, {
      ...init,
      headers: { Authorization: `Bearer ${c.token}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
      signal: AbortSignal.timeout(10_000),
    });
    const datos = await r.json().catch(() => ({}));
    if (!r.ok) throw new ErrorMP(r.status, `Mercado Pago ${r.status}: ${(datos as { message?: string }).message ?? 'error'}`);
    return datos;
  };
  return {
    /** Preferencia de Checkout Pro para un pedido. Un solo renglón con el total calculado en la BD. */
    crearPreferencia(p: { pedidoId: string; folio: string; total: number; expira: string; correo?: string | null; urlRegreso: string; urlAviso: string }) {
      const https = p.urlRegreso.startsWith('https://');
      return llamar('/checkout/preferences', {
        method: 'POST',
        headers: { 'X-Idempotency-Key': `pref-${p.pedidoId}` },
        body: JSON.stringify({
          items: [{ id: p.folio, title: `Pupilentes AGO · pedido ${p.folio}`, quantity: 1, unit_price: p.total, currency_id: 'MXN' }],
          external_reference: p.pedidoId,
          notification_url: p.urlAviso,
          back_urls: { success: p.urlRegreso, pending: p.urlRegreso, failure: p.urlRegreso },
          ...(https ? { auto_return: 'approved' } : {}),             // MP exige https para regresar solo
          expires: true,
          expiration_date_to: p.expira,                              // el cobro vence con la reserva
          payment_methods: { excluded_payment_types: [{ id: 'ticket' }, { id: 'atm' }] },   // D2: sin efectivo (OXXO)
          statement_descriptor: 'PUPILENTESAGO',
          ...(p.correo ? { payer: { email: p.correo } } : {}),
        }),
      }) as Promise<{ id: string; init_point: string }>;
    },
    consultarPago(id: string) {
      if (!/^\d{1,30}$/.test(id)) throw new ErrorMP(400, 'id de pago inválido');
      return llamar(`/v1/payments/${id}`) as Promise<Record<string, unknown>>;
    },
    reembolsar(id: string, claveIdempotencia: string) {
      if (!/^\d{1,30}$/.test(id)) throw new ErrorMP(400, 'id de pago inválido');
      return llamar(`/v1/payments/${id}/refunds`, { method: 'POST', headers: { 'X-Idempotency-Key': claveIdempotencia }, body: '{}' }) as Promise<{ id: number | string }>;
    },
  };
}

/** Lo que guardamos de un pago (nunca datos de tarjeta: Checkout Pro no nos los da). */
export const resumenPago = (p: Record<string, unknown>) => ({
  id: String(p.id), status: p.status, status_detail: p.status_detail, transaction_amount: p.transaction_amount,
  currency_id: p.currency_id, external_reference: p.external_reference, payment_type_id: p.payment_type_id,
  date_of_expiration: p.date_of_expiration ?? null,
});
