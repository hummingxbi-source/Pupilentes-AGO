#!/usr/bin/env node
// Envia.com SIMULADO para probar la Fase 4 en local y en el CI, sin cuenta ni saldo.
// Imita lo que usan las Edge Functions (docs.envia.com): /ship/rate/, /ship/generate/, /ship/generaltrack/,
// y manda el aviso de rastreo (webhook) a ENVIA_WEBHOOK_URL con X-Webhook-Id, como Envia.
//
// Uso:
//   ENVIA_WEBHOOK_URL='http://127.0.0.1:55321/functions/v1/webhook-envia?s=<ENVIA_WEBHOOK_SECRET>' \
//   MP_SIM_HOST=0.0.0.0 node scripts/envia-simulado.mjs          (puerto 8091, o ENVIA_SIM_PUERTO)
// y en supabase/functions/.env:  ENVIA_TOKEN=TEST-local  ENVIA_API_URL=http://host.docker.internal:8091
//
// Reglas del simulador: el CP 00000 no tiene cobertura (400) y la paquetería "caida" responde 503.
// Atajo de pruebas: POST /simular/rastreo { trackingNumber, status } cambia el estado y manda el aviso.
// NUNCA usar en producción: no genera guías reales.
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

const PUERTO = Number(process.env.ENVIA_SIM_PUERTO ?? 8091);
const HOST = process.env.MP_SIM_HOST ?? process.env.ENVIA_SIM_HOST ?? '127.0.0.1';
const AVISO = process.env.ENVIA_WEBHOOK_URL;
const BASE = { estafeta: 120, dhl: 160, fedex: 150, redpack: 110 };
const guias = new Map();   // trackingNumber → { status, carrier }
let n = 100000;

const enviar = (res, estado, datos) => { res.writeHead(estado, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(datos)); };
const leer = (req) => new Promise((ok) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => { try { ok(b ? JSON.parse(b) : {}); } catch { ok({}); } }); });
const error = (res, estado, mensaje) => enviar(res, estado, { meta: 'error', error: { code: estado, message: mensaje } });

function precio(carrier, cuerpo, factor) {
  const kg = Number(cuerpo.packages?.[0]?.weight ?? 0.1);
  return Math.round(((BASE[carrier] ?? 140) + kg * 25) * factor * 100) / 100;
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (req.method === 'POST' && url.pathname.startsWith('/ship/')) {
      if (!/^Bearer \S+/.test(req.headers.authorization ?? '')) return error(res, 401, 'Unauthorized');
      const c = await leer(req);
      const carrier = String(c.shipment?.carrier ?? '').toLowerCase();

      if (url.pathname === '/ship/rate/' || url.pathname === '/ship/generate/') {
        if (carrier === 'caida') return error(res, 503, 'Carrier unavailable');
        if (!/^\d{5}$/.test(c.destination?.postalCode ?? '') || c.destination.postalCode === '00000') return error(res, 400, 'Invalid postal code');
        if (!c.origin?.postalCode || !c.packages?.length) return error(res, 400, 'Missing origin or packages');
      }
      if (url.pathname === '/ship/rate/') {
        return enviar(res, 200, { meta: 'rate', data: [
          { carrier, service: 'ground', serviceDescription: `${carrier} terrestre`, deliveryEstimate: '3-5 días hábiles', totalPrice: precio(carrier, c, 1), currency: 'MXN' },
          { carrier, service: 'express', serviceDescription: `${carrier} día siguiente`, deliveryEstimate: '1-2 días hábiles', totalPrice: precio(carrier, c, 1.8), currency: 'MXN' },
        ] });
      }
      if (url.pathname === '/ship/generate/') {
        if (!c.shipment?.service) return error(res, 400, 'Missing service');
        if (!c.destination?.street || !c.destination?.name) return error(res, 400, 'Missing destination address');
        const tn = `SIM${++n}`;
        guias.set(tn, { status: 'Created', carrier });
        console.log(`guía ${tn} (${carrier} ${c.shipment.service}) para CP ${c.destination.postalCode}`);
        return enviar(res, 200, { meta: 'generate', data: [{
          carrier, service: c.shipment.service, shipmentId: n, trackingNumber: tn,
          trackUrl: `https://test.envia.com/rastreo?label=${tn}`, label: `https://example.invalid/envia-simulado/${tn}.pdf`,
          totalPrice: precio(carrier, c, c.shipment.service === 'express' ? 1.8 : 1), currency: 'MXN',
        }] });
      }
      if (url.pathname === '/ship/generaltrack/') {
        const data = (c.trackingNumbers ?? []).filter((t) => guias.has(t)).map((t) => ({ trackingNumber: t, carrier: guias.get(t).carrier, status: guias.get(t).status, events: [] }));
        return enviar(res, 200, { meta: 'generaltrack', data });
      }
    }
    if (req.method === 'POST' && url.pathname === '/simular/rastreo') {
      const { trackingNumber, status } = await leer(req);
      const g = guias.get(trackingNumber);
      if (!g) return error(res, 404, 'Unknown tracking number');
      g.status = status;
      let r = { status: 0 };
      if (AVISO) {
        r = await fetch(AVISO, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Webhook-Id': randomUUID() },
          body: JSON.stringify({ carrierName: g.carrier, trackingNumber, status }) });
        console.log(`aviso ${trackingNumber} (${status}) → ${r.status}`);
      }
      return enviar(res, 200, { trackingNumber, status, aviso: r.status });
    }
    enviar(res, 404, { message: 'not found' });
  } catch (e) { error(res, 500, e.message); }
}).listen(PUERTO, HOST, () => console.log(`Envia simulado en http://${HOST}:${PUERTO}`));
