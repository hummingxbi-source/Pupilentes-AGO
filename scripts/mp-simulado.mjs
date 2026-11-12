#!/usr/bin/env node
// Mercado Pago SIMULADO para probar la Fase 3 en local, sin cuenta ni internet.
// Imita lo que usan las Edge Functions: crear preferencia, consultar pago, reembolsar,
// y manda el aviso (webhook) FIRMADO igual que Mercado Pago (x-signature HMAC-SHA256).
//
// Uso:
//   MP_WEBHOOK_SECRET=<el mismo de supabase/functions/.env> \
//   MP_NOTIFICATION_URL=http://127.0.0.1:54321/functions/v1/webhook-mercadopago \
//   node scripts/mp-simulado.mjs            (puerto 8090, o MP_SIM_PUERTO)
// y en supabase/functions/.env:  MP_API_URL=http://127.0.0.1:8090  MP_ACCESS_TOKEN=TEST-local
//
// Al pagar, la página "checkout" deja elegir: aprobado, rechazado o SPEI pendiente.
// NUNCA usar en producción: no cobra nada, solo sirve para probar el flujo.
import { createServer } from 'node:http';
import { createHmac, randomUUID } from 'node:crypto';

const PUERTO = Number(process.env.MP_SIM_PUERTO ?? 8090);
const SECRETO = process.env.MP_WEBHOOK_SECRET;
const AVISO = process.env.MP_NOTIFICATION_URL;   // si falta, se usa el notification_url de la preferencia
if (!SECRETO) { console.error('Falta MP_WEBHOOK_SECRET'); process.exit(1); }

const prefs = new Map();
const pagos = new Map();
let siguiente = 9_000_000_001;

const enviar = (res, estado, datos, tipo = 'application/json') => {
  res.writeHead(estado, { 'Content-Type': tipo + '; charset=utf-8' });
  res.end(tipo === 'application/json' ? JSON.stringify(datos) : datos);
};
const leer = (req) => new Promise((ok) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => { try { ok(b ? JSON.parse(b) : {}); } catch { ok(Object.fromEntries(new URLSearchParams(b))); } }); });
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

async function avisar(pago, url) {
  const ts = String(Date.now()), rid = randomUUID(), id = String(pago.id);
  const v1 = createHmac('sha256', SECRETO).update(`id:${id};request-id:${rid};ts:${ts};`).digest('hex');
  const destino = `${AVISO ?? url}?data.id=${id}&type=payment`;
  try {
    const r = await fetch(destino, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-signature': `ts=${ts},v1=${v1}`, 'x-request-id': rid },
      body: JSON.stringify({ id: Date.now(), type: 'payment', action: 'payment.updated', live_mode: false, data: { id } }),
    });
    console.log(`aviso pago ${id} (${pago.status}) → ${r.status} ${await r.text()}`);
  } catch (e) { console.error('aviso falló', e.message); }
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const autorizado = /^Bearer \S+/.test(req.headers.authorization ?? '');
  try {
    if (req.method === 'POST' && url.pathname === '/checkout/preferences') {
      if (!autorizado) return enviar(res, 401, { message: 'unauthorized' });
      const p = await leer(req);
      const clave = req.headers['x-idempotency-key'];
      const previa = [...prefs.values()].find((x) => x.clave && x.clave === clave);
      if (previa) return enviar(res, 201, { id: previa.id, init_point: previa.init_point });
      const id = `sim-${randomUUID()}`;
      const pref = { ...p, id, clave, init_point: `http://${req.headers.host}/checkout?pref=${id}` };
      prefs.set(id, pref);
      return enviar(res, 201, { id, init_point: pref.init_point });
    }
    if (req.method === 'GET' && url.pathname === '/checkout') {
      const p = prefs.get(url.searchParams.get('pref'));
      if (!p) return enviar(res, 404, 'Preferencia no encontrada', 'text/html');
      const it = p.items[0];
      return enviar(res, 200, `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>Mercado Pago (simulado)</title><body style="font-family:system-ui;max-width:420px;margin:40px auto;padding:0 16px">
<p style="background:#fff3cd;padding:8px 12px;border-radius:6px">Simulador local · no se cobra nada</p>
<h1 style="font-size:20px">${esc(it.title)}</h1><p style="font-size:28px;margin:8px 0">$${esc(it.unit_price)} MXN</p>
<p>Vence: ${esc(p.expiration_date_to ?? '—')}<br>Medios excluidos: ${esc((p.payment_methods?.excluded_payment_types ?? []).map((x) => x.id).join(', ') || 'ninguno')}</p>
<form method="post" action="/simular"><input type="hidden" name="pref" value="${esc(p.id)}">
<button name="status" value="approved" style="padding:12px 18px;font-size:16px">Pagar con tarjeta (aprobado)</button>
<button name="status" value="pending" style="padding:12px 18px">SPEI (pendiente)</button>
<button name="status" value="rejected" style="padding:12px 18px">Tarjeta rechazada</button></form></body>`, 'text/html');
    }
    if (req.method === 'POST' && url.pathname === '/simular') {
      const f = await leer(req);
      const p = prefs.get(f.pref);
      if (!p || !['approved', 'pending', 'rejected'].includes(f.status)) return enviar(res, 400, { message: 'bad request' });
      const pago = {
        id: siguiente++, status: f.status, status_detail: f.status === 'approved' ? 'accredited' : f.status === 'pending' ? 'pending_waiting_transfer' : 'cc_rejected_other_reason',
        transaction_amount: Number(p.items[0].unit_price), currency_id: p.items[0].currency_id ?? 'MXN', external_reference: p.external_reference,
        payment_type_id: f.status === 'pending' ? 'bank_transfer' : 'credit_card',
        date_of_expiration: f.status === 'pending' ? new Date(Date.now() + 2 * 86400_000).toISOString() : null, notification_url: p.notification_url,
      };
      pagos.set(String(pago.id), pago);
      await avisar(pago, p.notification_url);
      const regreso = `${p.back_urls[f.status === 'approved' ? 'success' : f.status === 'pending' ? 'pending' : 'failure']}?payment_id=${pago.id}&status=${pago.status}&external_reference=${p.external_reference}`;
      res.writeHead(303, { Location: regreso }); return res.end();
    }
    // Atajo para pruebas: cambiar el estado de un pago y mandar el aviso (p. ej. SPEI acreditado, contracargo)
    let m = /^\/simular\/pagos\/(\d+)$/.exec(url.pathname);
    if (req.method === 'POST' && m) {
      const pago = pagos.get(m[1]); if (!pago) return enviar(res, 404, { message: 'not found' });
      const status = (await leer(req)).status ?? 'approved';
      Object.assign(pago, { status, status_detail: status === 'approved' ? 'accredited' : status });
      await avisar(pago, pago.notification_url);
      return enviar(res, 200, pago);
    }
    m = /^\/v1\/payments\/(\d+)$/.exec(url.pathname);
    if (req.method === 'GET' && m) {
      if (!autorizado) return enviar(res, 401, { message: 'unauthorized' });
      const pago = pagos.get(m[1]);
      return pago ? enviar(res, 200, pago) : enviar(res, 404, { message: 'Payment not found' });
    }
    m = /^\/v1\/payments\/(\d+)\/refunds$/.exec(url.pathname);
    if (req.method === 'POST' && m) {
      if (!autorizado) return enviar(res, 401, { message: 'unauthorized' });
      const pago = pagos.get(m[1]);
      if (!pago || pago.status !== 'approved') return enviar(res, 400, { message: 'Payment not refundable' });
      pago.status = 'refunded';
      setTimeout(() => avisar(pago, pago.notification_url), 300);
      return enviar(res, 201, { id: siguiente++, payment_id: pago.id, amount: pago.transaction_amount, status: 'approved' });
    }
    enviar(res, 404, { message: 'not found' });
  } catch (e) { enviar(res, 500, { message: e.message }); }
}).listen(PUERTO, '127.0.0.1', () => console.log(`Mercado Pago simulado en http://127.0.0.1:${PUERTO}`));
