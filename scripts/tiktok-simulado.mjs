#!/usr/bin/env node
// TikTok Shop SIMULADO para probar la Fase 6 en local y en el CI, sin app de Partner Center.
// Imita lo que usan las Edge Functions (Partner API 202309):
//   /open/authorize (aprueba solo y regresa con code y state), /api/v2/token/get y /refresh,
//   /authorization/202309/shops, /product/202309/products/search, /product/202309/products/{id}/inventory/update,
//   /order/202309/orders?ids=, /order/202309/orders/search — y RECHAZA peticiones mal firmadas (code 106001).
// Manda avisos ORDER_STATUS_CHANGE a TT_WEBHOOK_URL firmados como TikTok: Authorization = HMAC-SHA256(app_secret, app_key + cuerpo).
//
// Uso:  TT_APP_KEY=ttkey TT_APP_SECRET=… TT_WEBHOOK_URL=http://127.0.0.1:55321/functions/v1/webhook-tiktok \
//       MP_SIM_HOST=0.0.0.0 node scripts/tiktok-simulado.mjs            (puerto 8093, o TT_SIM_PUERTO)
// Atajos: POST /simular/venta { producto, sku, cantidad?, sin_aviso?, estado? } · POST /simular/cancelar { orden }
//         POST /simular/aviso-falso { orden } (firma inválida) · GET /simular/productos/:id
// NUNCA usar en producción.
import { createServer } from 'node:http';
import { createHmac, randomUUID } from 'node:crypto';

const PUERTO = Number(process.env.TT_SIM_PUERTO ?? 8093);
const HOST = process.env.MP_SIM_HOST ?? process.env.TT_SIM_HOST ?? '127.0.0.1';
const KEY = process.env.TT_APP_KEY ?? 'ttkey';
const SECRETO = process.env.TT_APP_SECRET;
const AVISO = process.env.TT_WEBHOOK_URL;
if (!SECRETO) { console.error('Falta TT_APP_SECRET'); process.exit(1); }
const TIENDA = { id: '7494000000000000001', name: 'Pupilentes AGO (sim)', cipher: 'ROW_sim_cipher_123' };

const productos = new Map(Object.entries({
  '1730000000000000001': { id: '1730000000000000001', title: 'Pupilentes Urban Layer anuales (sim)', status: 'ACTIVATE', skus: [
    { id: '1730000000000000101', seller_sku: 'UL-SIRI-BLUE-ANU-N', inventory: [{ quantity: 4, warehouse_id: '7000000000000000001' }], sales_attributes: [{ value_name: 'Siri Blue' }] },
    { id: '1730000000000000102', seller_sku: 'UL-HONEY-BROWN-ANU-N', inventory: [{ quantity: 7, warehouse_id: '7000000000000000001' }], sales_attributes: [{ value_name: 'Honey Brown' }] },
    { id: '1730000000000000103', seller_sku: null, inventory: [{ quantity: 2, warehouse_id: '7000000000000000001' }], sales_attributes: [{ value_name: 'Tono solo en TikTok' }] },
  ] },
}));
const ordenes = new Map();
const codigos = new Set();
let acceso = null, refresco = null, n = 5800000000000000001n;

const firmar = (texto) => createHmac('sha256', SECRETO).update(texto).digest('hex');
const firmaPeticion = (ruta, params, cuerpo) =>
  firmar(SECRETO + ruta + Object.keys(params).filter((k) => k !== 'sign' && k !== 'access_token').sort().map((k) => k + params[k]).join('') + cuerpo + SECRETO);
const enviar = (res, estado, datos, enc = {}) => { res.writeHead(estado, { 'Content-Type': 'application/json; charset=utf-8', ...enc }); res.end(JSON.stringify(datos)); };
const ok = (res, data) => enviar(res, 200, { code: 0, message: 'Success', data, request_id: randomUUID() });
const mal = (res, code, message, estado = 200) => enviar(res, estado, { code, message, request_id: randomUUID() });
const leerCrudo = (req) => new Promise((r) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => r(b)); });
const nuevoToken = () => { acceso = `TTP_${randomUUID()}`; refresco = `TTP_R_${randomUUID()}`;
  return { access_token: acceso, access_token_expire_in: Math.floor(Date.now() / 1000) + 7 * 86400, refresh_token: refresco,
    refresh_token_expire_in: Math.floor(Date.now() / 1000) + 365 * 86400, open_id: 'open-sim', seller_name: 'AGO (sim)' }; };

async function avisar(orden, firmaMala = false) {
  if (!AVISO) return 0;
  const cuerpo = JSON.stringify({ type: 1, tts_notification_id: String(n++), shop_id: TIENDA.id, timestamp: Math.floor(Date.now() / 1000),
    data: { order_id: orden.id, order_status: orden.status, update_time: orden.update_time } });
  const r = await fetch(AVISO, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: firmaMala ? 'a'.repeat(64) : firmar(KEY + cuerpo) }, body: cuerpo });
  console.log(`aviso orden ${orden.id} (${orden.status}) → ${r.status}`);
  return r.status;
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const p = url.pathname;
  const q = Object.fromEntries(url.searchParams);
  try {
    if (req.method === 'GET' && p === '/open/authorize') {
      const code = `TTP_code_${randomUUID()}`; codigos.add(code);
      const destino = new URL(process.env.TT_REDIRECT_URI ?? 'http://localhost:5173/panel/canales');
      destino.searchParams.set('canal', 'tiktok'); destino.searchParams.set('code', code); destino.searchParams.set('state', q.state ?? '');
      res.writeHead(302, { Location: destino.toString() }); return res.end();
    }
    if (req.method === 'GET' && (p === '/api/v2/token/get' || p === '/api/v2/token/refresh')) {
      if (q.app_key !== KEY || q.app_secret !== SECRETO) return mal(res, 36004004, 'invalid app');
      if (p.endsWith('/get')) { if (q.grant_type !== 'authorized_code' || !codigos.delete(q.auth_code)) return mal(res, 36004002, 'invalid auth code'); }
      else if (q.grant_type !== 'refresh_token' || q.refresh_token !== refresco) return mal(res, 36004003, 'invalid refresh token');
      return ok(res, nuevoToken());
    }
    if (p.startsWith('/simular/')) {
      const cuerpo = JSON.parse((await leerCrudo(req)) || '{}');
      const m = /^\/simular\/productos\/(\d+)$/.exec(p);
      if (req.method === 'GET' && m) return productos.has(m[1]) ? enviar(res, 200, productos.get(m[1])) : enviar(res, 404, {});
      if (p === '/simular/venta') {
        const prod = productos.get(String(cuerpo.producto)); const sku = prod?.skus.find((s) => s.id === String(cuerpo.sku));
        if (!sku) return enviar(res, 404, { message: 'sku not found' });
        const cant = Number(cuerpo.cantidad ?? 1);
        sku.inventory[0].quantity = Math.max(0, sku.inventory[0].quantity - cant);
        // Como TikTok: una línea por pieza (sin `quantity`)
        const orden = { id: String(n++), status: cuerpo.estado ?? 'AWAITING_SHIPMENT', update_time: Math.floor(Date.now() / 1000),
          line_items: Array.from({ length: cant }, () => ({ id: String(n++), product_id: prod.id, sku_id: sku.id, seller_sku: sku.seller_sku })) };
        ordenes.set(orden.id, orden);
        return enviar(res, 200, { orden: orden.id, aviso: cuerpo.sin_aviso ? 0 : await avisar(orden) });
      }
      if (p === '/simular/cancelar') {
        const o = ordenes.get(String(cuerpo.orden)); if (!o) return enviar(res, 404, {});
        o.status = 'CANCELLED'; o.update_time = Math.floor(Date.now() / 1000);
        return enviar(res, 200, { orden: o.id, aviso: await avisar(o) });
      }
      if (p === '/simular/aviso-falso') {
        const o = ordenes.get(String(cuerpo.orden)) ?? { id: '1', status: 'AWAITING_SHIPMENT' };
        return enviar(res, 200, { aviso: await avisar(o, true) });
      }
      return enviar(res, 404, {});
    }

    // Partner API: token + firma obligatorios
    const crudo = await leerCrudo(req);
    if (!acceso || req.headers['x-tts-access-token'] !== acceso) return mal(res, 105002, 'invalid access token', 401);
    if (q.app_key !== KEY || !q.timestamp || q.sign !== firmaPeticion(p, q, crudo)) return mal(res, 106001, 'invalid sign');
    const necesitaTienda = !p.startsWith('/authorization/');
    if (necesitaTienda && q.shop_cipher !== TIENDA.cipher) return mal(res, 106011, 'invalid shop_cipher');
    const cuerpo = crudo ? JSON.parse(crudo) : {};

    if (req.method === 'GET' && p === '/authorization/202309/shops') return ok(res, { shops: [{ ...TIENDA, region: 'MX', seller_type: 'LOCAL' }] });
    if (req.method === 'POST' && p === '/product/202309/products/search') return ok(res, { products: [...productos.values()], total_count: productos.size, next_page_token: '' });
    let m = /^\/product\/202309\/products\/(\d+)\/inventory\/update$/.exec(p);
    if (req.method === 'POST' && m) {
      const prod = productos.get(m[1]); if (!prod) return mal(res, 12052260, 'product id not exist');
      for (const s of cuerpo.skus ?? []) {
        const sku = prod.skus.find((x) => x.id === String(s.id)); if (!sku) return mal(res, 12052556, 'The SKU id not exist.');
        const q2 = Number(s.inventory?.[0]?.quantity); if (!Number.isInteger(q2) || q2 < 0 || q2 >= 99999) return mal(res, 12019024, 'stock count is invalid');
        sku.inventory[0].quantity = q2;
      }
      console.log(`inventario ${prod.id} → ${JSON.stringify(prod.skus.map((s) => [s.id.slice(-3), s.inventory[0].quantity]))}`);
      return ok(res, {});
    }
    if (req.method === 'GET' && p === '/order/202309/orders') {
      return ok(res, { orders: String(q.ids ?? '').split(',').filter((i) => ordenes.has(i)).map((i) => ordenes.get(i)) });
    }
    if (req.method === 'POST' && p === '/order/202309/orders/search') {
      const desde = Number(cuerpo.update_time_ge ?? 0);
      const r = [...ordenes.values()].filter((o) => o.update_time >= desde).reverse();
      return ok(res, { orders: r.slice(0, Number(q.page_size ?? 50)), total_count: r.length, next_page_token: '' });
    }
    mal(res, 404, 'not found', 404);
  } catch (e) { mal(res, 500, e.message, 500); }
}).listen(PUERTO, HOST, () => console.log(`TikTok Shop simulado en http://${HOST}:${PUERTO}`));
