#!/usr/bin/env node
// Mercado Libre SIMULADO para probar la Fase 5 en local y en el CI, sin cuenta de la clienta.
// Imita lo que usan las Edge Functions (developers.mercadolibre.com.mx):
//   /authorization (aprueba solo y regresa a redirect_uri con code y state), /oauth/token (code y refresh;
//   solo el ÚLTIMO refresh token sirve), /users/me, /users/:id/items/search, /items?ids=, /items/:id (GET/PUT),
//   /orders/:id, /orders/search, y manda avisos orders_v2 a ML_WEBHOOK_URL.
// Para probar que no borramos variaciones ajenas: un PUT con `variations` que omite alguna, la BORRA
// (es el riesgo que evitamos mandando siempre todas).
//
// Uso:  ML_APP_ID=123 ML_WEBHOOK_URL=http://127.0.0.1:55321/functions/v1/webhook-mercadolibre \
//       MP_SIM_HOST=0.0.0.0 node scripts/ml-simulado.mjs            (puerto 8092, o ML_SIM_PUERTO)
// En supabase/functions/.env: ML_APP_ID=123 ML_CLIENT_SECRET=x ML_REDIRECT_URI=http://localhost:5173/panel/canales
//   ML_API_URL=http://host.docker.internal:8092 ML_AUTH_URL=http://127.0.0.1:8092
// Atajos: POST /simular/venta { item, variacion?, cantidad, sin_aviso? } · POST /simular/cancelar { orden }
//         POST /simular/expirar (vence el access token) · GET /simular/items/:id (estado del ítem, sin token)
// NUNCA usar en producción.
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

const PUERTO = Number(process.env.ML_SIM_PUERTO ?? 8092);
const HOST = process.env.MP_SIM_HOST ?? process.env.ML_SIM_HOST ?? '127.0.0.1';
const APP = String(process.env.ML_APP_ID ?? '123');
const AVISO = process.env.ML_WEBHOOK_URL;
const VENDEDOR = 777001;

const items = new Map(Object.entries({
  MLM100100: { id: 'MLM100100', title: 'Pupilentes Urban Layer Cloud Gray anuales', status: 'active', available_quantity: 5, seller_custom_field: 'UL-CLOUD-GRAY-ANU-N', shipping: { logistic_type: 'cross_docking' }, variations: [] },
  MLM200200: { id: 'MLM200200', title: 'Pupilentes Urban Layer azules (varios tonos)', status: 'active', shipping: { logistic_type: 'cross_docking' }, variations: [
    { id: 20001, available_quantity: 3, seller_custom_field: 'UL-OCEAN-BLUE-ANU-N', attribute_combinations: [{ value_name: 'Ocean Blue' }] },
    { id: 20002, available_quantity: 4, seller_custom_field: null, attribute_combinations: [{ value_name: 'Siri Blue' }] },
    { id: 20003, available_quantity: 2, seller_custom_field: 'OTRO-SKU', attribute_combinations: [{ value_name: 'Tono que no vendemos en la web' }] },
  ] },
  MLM300300: { id: 'MLM300300', title: 'Pupilentes Freshlady (Full)', status: 'active', available_quantity: 9, seller_custom_field: 'FRES-FRESHLADY-AZUL-ANU-N', shipping: { logistic_type: 'fulfillment' }, variations: [] },
}));
const ordenes = new Map();
const codigos = new Set();
let acceso = null, refresco = null, accesoVence = 0, nOrden = 2000000001;

const enviar = (res, estado, datos, enc = {}) => { res.writeHead(estado, { 'Content-Type': 'application/json; charset=utf-8', ...enc }); res.end(JSON.stringify(datos)); };
const leer = (req) => new Promise((ok) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => {
  if ((req.headers['content-type'] ?? '').includes('x-www-form-urlencoded')) return ok(Object.fromEntries(new URLSearchParams(b)));
  try { ok(b ? JSON.parse(b) : {}); } catch { ok({}); } }); });
const autorizado = (req) => acceso && req.headers.authorization === `Bearer ${acceso}` && Date.now() < accesoVence;
const nuevoToken = () => { acceso = `APP_USR-${randomUUID()}`; refresco = `TG-${randomUUID()}`; accesoVence = Date.now() + 6 * 3600_000;
  return { access_token: acceso, token_type: 'Bearer', expires_in: 21600, scope: 'offline_access read write', user_id: VENDEDOR, refresh_token: refresco }; };
const cantidadDe = (it, v) => (v ? it.variations.find((x) => String(x.id) === String(v))?.available_quantity : it.available_quantity);

async function avisar(orden) {
  if (!AVISO) return 0;
  const r = await fetch(AVISO, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
    _id: randomUUID(), resource: `/orders/${orden.id}`, user_id: VENDEDOR, topic: 'orders_v2', application_id: Number(APP),
    attempts: 1, sent: new Date().toISOString(), received: new Date().toISOString() }) });
  console.log(`aviso orden ${orden.id} (${orden.status}) → ${r.status}`);
  return r.status;
}

const servidor = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const p = url.pathname;
  try {
    if (req.method === 'GET' && p === '/authorization') {
      if (url.searchParams.get('client_id') !== APP) return enviar(res, 400, { message: 'invalid client_id' });
      const code = `TG-code-${randomUUID()}`; codigos.add(code);
      const destino = new URL(url.searchParams.get('redirect_uri'));
      destino.searchParams.set('code', code); destino.searchParams.set('state', url.searchParams.get('state') ?? '');
      res.writeHead(302, { Location: destino.toString() }); return res.end();
    }
    if (req.method === 'POST' && p === '/oauth/token') {
      const f = await leer(req);
      if (f.client_id !== APP || !f.client_secret) return enviar(res, 401, { error: 'invalid_client' });
      if (f.grant_type === 'authorization_code') {
        if (!codigos.delete(f.code)) return enviar(res, 400, { error: 'invalid_grant', message: 'code inválido o usado' });
        return enviar(res, 200, nuevoToken());
      }
      if (f.grant_type === 'refresh_token') {
        if (f.refresh_token !== refresco) return enviar(res, 400, { error: 'invalid_grant', message: 'solo sirve el último refresh token' });
        return enviar(res, 200, nuevoToken());
      }
      return enviar(res, 400, { error: 'unsupported_grant_type' });
    }
    if (p.startsWith('/simular/')) {
      if (req.method === 'POST' && p === '/simular/expirar') { accesoVence = 0; return enviar(res, 200, { ok: true }); }
      let m = /^\/simular\/items\/(\w+)$/.exec(p);
      if (req.method === 'GET' && m) return items.has(m[1]) ? enviar(res, 200, items.get(m[1])) : enviar(res, 404, { message: 'not found' });
      if (req.method === 'POST' && p === '/simular/venta') {
        const f = await leer(req); const it = items.get(f.item);
        if (!it) return enviar(res, 404, { message: 'item not found' });
        const v = f.variacion ? it.variations.find((x) => String(x.id) === String(f.variacion)) : null;
        if (f.variacion && !v) return enviar(res, 404, { message: 'variation not found' });
        const q = Number(f.cantidad ?? 1);
        if (v) v.available_quantity = Math.max(0, v.available_quantity - q); else it.available_quantity = Math.max(0, it.available_quantity - q);
        const orden = { id: nOrden++, status: 'paid', date_last_updated: new Date().toISOString(), seller: { id: VENDEDOR },
          order_items: [{ item: { id: it.id, variation_id: v ? v.id : null, title: it.title }, quantity: q }] };
        ordenes.set(String(orden.id), orden);
        const aviso = f.sin_aviso ? 0 : await avisar(orden);
        return enviar(res, 200, { orden: orden.id, aviso });
      }
      if (req.method === 'POST' && p === '/simular/cancelar') {
        const f = await leer(req); const o = ordenes.get(String(f.orden));
        if (!o) return enviar(res, 404, { message: 'order not found' });
        o.status = 'cancelled'; o.date_last_updated = new Date().toISOString();
        return enviar(res, 200, { orden: o.id, aviso: await avisar(o) });
      }
      return enviar(res, 404, { message: 'not found' });
    }

    if (!autorizado(req)) return enviar(res, 401, { message: 'invalid access token', error: 'unauthorized' });
    if (req.method === 'GET' && p === '/users/me') return enviar(res, 200, { id: VENDEDOR, nickname: 'PUPILENTES.AGO.SIM' });
    let m = /^\/users\/(\d+)\/items\/search$/.exec(p);
    if (req.method === 'GET' && m) {
      if (Number(m[1]) !== VENDEDOR) return enviar(res, 403, { message: 'forbidden' });
      const ids = [...items.keys()]; const off = Number(url.searchParams.get('offset') ?? 0);
      return enviar(res, 200, { results: ids.slice(off, off + 50), paging: { total: ids.length, offset: off, limit: 50 } });
    }
    if (req.method === 'GET' && p === '/items') {
      const ids = (url.searchParams.get('ids') ?? '').split(',').filter(Boolean);
      return enviar(res, 200, ids.map((id) => (items.has(id) ? { code: 200, body: items.get(id) } : { code: 404, body: { message: 'not found' } })));
    }
    m = /^\/items\/(\w+)$/.exec(p);
    if (m) {
      const it = items.get(m[1]);
      if (!it) return enviar(res, 404, { message: 'not found' });
      if (req.method === 'GET') return enviar(res, 200, it);
      if (req.method === 'PUT') {
        const f = await leer(req);
        if (it.shipping?.logistic_type === 'fulfillment') return enviar(res, 400, { message: 'fulfillment stock is managed by Mercado Libre' });
        if (Array.isArray(f.variations)) {
          const enviadas = new Map(f.variations.map((x) => [String(x.id), x]));
          it.variations = it.variations.filter((x) => enviadas.has(String(x.id)));   // las omitidas se borran
          for (const x of it.variations) { const e = enviadas.get(String(x.id)); if (e.available_quantity != null) x.available_quantity = Number(e.available_quantity); }
        } else if (f.available_quantity != null) {
          if (it.variations.length) return enviar(res, 400, { message: 'item has variations' });
          it.available_quantity = Number(f.available_quantity);
        }
        it.status = (it.variations.length ? it.variations.every((x) => x.available_quantity === 0) : it.available_quantity === 0) ? 'paused' : 'active';
        console.log(`PUT ${it.id} → ${JSON.stringify(it.variations.length ? it.variations.map((x) => [x.id, x.available_quantity]) : it.available_quantity)}`);
        return enviar(res, 200, it);
      }
    }
    m = /^\/orders\/(\d+)$/.exec(p);
    if (req.method === 'GET' && m) return ordenes.has(m[1]) ? enviar(res, 200, ordenes.get(m[1])) : enviar(res, 404, { message: 'order not found' });
    if (req.method === 'GET' && p === '/orders/search') {
      if (Number(url.searchParams.get('seller')) !== VENDEDOR) return enviar(res, 403, { message: 'forbidden' });
      const desde = new Date(url.searchParams.get('order.date_last_updated.from') ?? 0).getTime();
      const r = [...ordenes.values()].filter((o) => new Date(o.date_last_updated).getTime() >= desde).reverse();
      return enviar(res, 200, { results: r.slice(0, 50), paging: { total: r.length } });
    }
    enviar(res, 404, { message: 'not found' });
  } catch (e) { enviar(res, 500, { message: e.message }); }
});
// Las Edge Functions (Deno) reutilizan conexiones: con el keep-alive de 5 s de Node, a veces mandaban la petición
// justo cuando el simulador cerraba el socket ("connection closed before message completed"). Se alarga.
servidor.keepAliveTimeout = 65_000;
servidor.headersTimeout = 66_000;
servidor.listen(PUERTO, HOST, () => console.log(`Mercado Libre simulado en http://${HOST}:${PUERTO}`));
