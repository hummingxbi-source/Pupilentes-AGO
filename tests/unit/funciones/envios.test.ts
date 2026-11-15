// Pruebas unitarias · Fase 4 · envíos (Envia.com simulado con fetch falso).
import assert from 'node:assert/strict';
import { categoriaEstado, clienteEnvia } from '../../../supabase/functions/_shared/envia.ts';
import { manejar as cotizar } from '../../../supabase/functions/envios-cotizar/manejador.ts';
import { manejar as guia } from '../../../supabase/functions/envios-guia/manejador.ts';
import { manejar as webhook } from '../../../supabase/functions/webhook-envia/manejador.ts';
import type { SupabaseClient } from '../../../supabase/functions/_shared/deps.ts';

type Rpc = Record<string, (args: Record<string, unknown>) => unknown>;
const CFG = {
  envio_origen: { name: 'AGO', phone: '5500000000', street: 'X', city: 'Iztacalco', state: 'CX', postalCode: '08000', country: 'MX' },
  envio_peso_par_kg: 0.1, envio_caja_cm: { length: 15, width: 10, height: 6 }, envio_paqueterias: ['estafeta', 'dhl'], max_piezas_pedido: 10,
};
function bd({ rpc = {} as Rpc, tablas = {} as Record<string, unknown>, rol = 'duena' as string | null } = {}) {
  const llamadas: { rpc: string; args: Record<string, unknown> }[] = [];
  const admin = {
    auth: { getClaims: async (t: string) => t === 'jwt-valido' ? { data: { claims: { sub: 'u-1', role: 'authenticated', aal: 'aal2' } }, error: null } : { data: null, error: { message: 'x' } } },
    from: (tabla: string) => {
      const dato = tabla === 'perfiles_panel' ? (rol ? { rol } : null) : tabla === 'config_tienda' ? CFG : tablas[tabla] ?? null;
      const q: Record<string, unknown> = {};
      for (const m of ['select', 'eq', 'not', 'order', 'limit', 'in']) q[m] = () => q;
      q.maybeSingle = async () => ({ data: Array.isArray(dato) ? dato[0] ?? null : dato, error: null });
      q.single = async () => ({ data: dato, error: null });
      q.then = (ok: (v: unknown) => unknown) => ok({ data: dato, error: null });
      return q;
    },
    rpc: async (nombre: string, args: Record<string, unknown>) => {
      llamadas.push({ rpc: nombre, args });
      if (nombre === 'consumir_limite') return { data: true, error: null };
      const r = rpc[nombre]?.(args);
      return r && typeof r === 'object' && 'error' in (r as object) ? r : { data: r ?? null, error: null };
    },
  } as unknown as SupabaseClient;
  return { admin, hizo: (n: string) => llamadas.filter((l) => l.rpc === n) };
}
const post = (cuerpo: unknown, enc: Record<string, string> = {}, url = 'http://x') =>
  new Request(url, { method: 'POST', body: JSON.stringify(cuerpo), headers: { 'content-type': 'application/json', ...enc } });

/** Envia falso: por paquetería decide qué responder. */
function enviaFalso(porCarrier: Record<string, () => Response>, rastreo = 'In transit') {
  const vistos: { ruta: string; cuerpo: Record<string, unknown> }[] = [];
  const f = (async (url: string, init: RequestInit) => {
    const cuerpo = JSON.parse(String(init.body));
    const ruta = new URL(url).pathname;
    vistos.push({ ruta, cuerpo });
    if (ruta === '/ship/generaltrack/') return Response.json({ meta: 'generaltrack', data: [{ trackingNumber: cuerpo.trackingNumbers[0], status: rastreo }] });
    return (porCarrier[cuerpo.shipment.carrier] ?? (() => Response.json({ meta: 'error', error: { message: 'x' } }, { status: 400 })))();
  }) as typeof fetch;
  return { envia: clienteEnvia({ token: 't', api: 'https://envia.simulado' }, f), vistos };
}
const tarifa = (carrier: string, precio: number) => () => Response.json({ meta: 'rate', data: [
  { carrier, service: 'ground', serviceDescription: 'Terrestre', deliveryEstimate: '3-5 días', totalPrice: precio, currency: 'MXN' },
] });

// ------------------------------------------------------------------------------- categoriaEstado
Deno.test('categoriaEstado: entregado, en camino, incidencia y sin cambio (incluye "out for delivery")', () => {
  assert.equal(categoriaEstado('Delivered'), 'entregado');
  assert.equal(categoriaEstado('Entregado'), 'entregado');
  assert.equal(categoriaEstado('Out for delivery'), 'en_camino', 'en reparto todavía no es entregado');
  assert.equal(categoriaEstado('In transit'), 'en_camino');
  assert.equal(categoriaEstado('Picked up'), 'en_camino');
  assert.equal(categoriaEstado('Delivery attempt failed'), 'incidencia');
  assert.equal(categoriaEstado('Returned to sender'), 'incidencia');
  assert.equal(categoriaEstado('Created'), 'sin_cambio');
  assert.equal(categoriaEstado('algo nuevo'), 'sin_cambio', 'lo desconocido no mueve el pedido');
});

// ------------------------------------------------------------------------------- envios-cotizar
const COT = { items: [{ sku: 'UL-OCEAN-BLUE-ANU-N', cantidad: 2 }], destino: { cp: '06600', ciudad: 'Cuauhtémoc', estado: 'CDMX' }, turnstile: 'tok' };

Deno.test('envios-cotizar: peso y valor salen de la BD; una petición por paquetería; guarda las opciones', async () => {
  const b = bd({ tablas: { variantes: [{ sku: 'UL-OCEAN-BLUE-ANU-N', precio: 799, activo: true }] }, rpc: { guardar_cotizaciones: (a) => (a.p_opciones as unknown[]).map((o, i) => ({ id: `id-${i}`, ...(o as object) })) } });
  const { envia, vistos } = enviaFalso({ estafeta: tarifa('estafeta', 130), dhl: tarifa('dhl', 99) });
  const r = await cotizar(post(COT), { admin: b.admin, envia, turnstile: async () => ({ ok: true }) });
  assert.equal(r.status, 200);
  assert.equal(vistos.length, 2, 'Envia cotiza una paquetería por petición');
  const paq = (vistos[0].cuerpo.packages as { weight: number; declaredValue: number }[])[0];
  assert.equal(paq.weight, 0.2, '2 pares × 0.1 kg');
  assert.equal(paq.declaredValue, 1598, 'valor declarado con precios de la BD');
  const g = b.hizo('guardar_cotizaciones')[0].args;
  assert.equal(g.p_piezas, 2);
  assert.equal((g.p_opciones as { costo: number }[])[0].costo, 99, 'de la más barata a la más cara');
});

Deno.test('envios-cotizar: Turnstile, Envia sin configurar, SKU inexistente, CP sin cobertura y Envia caído', async () => {
  const b = bd({ tablas: { variantes: [{ sku: 'UL-OCEAN-BLUE-ANU-N', precio: 799, activo: true }] } });
  const ok = async () => ({ ok: true });
  assert.equal((await cotizar(post(COT), { admin: b.admin, envia: null, turnstile: async () => ({ ok: false }) })).status, 403);
  assert.equal((await cotizar(post(COT), { admin: b.admin, envia: null, turnstile: ok })).status, 503);
  const sinSku = bd({ tablas: { variantes: [] } });
  assert.equal((await cotizar(post(COT), { admin: sinSku.admin, envia: enviaFalso({}).envia, turnstile: ok })).status, 409);
  const cp = await cotizar(post(COT), { admin: b.admin, envia: enviaFalso({}).envia, turnstile: ok });
  assert.equal(cp.status, 400, 'todas responden 400 → sin cobertura');
  assert.equal((await cp.json()).error, 'sin_cobertura');
  const caido = () => new Response('x', { status: 503 });
  assert.equal((await cotizar(post(COT), { admin: b.admin, envia: enviaFalso({ estafeta: caido, dhl: caido }).envia, turnstile: ok })).status, 502);
  const mitad = bd({ tablas: { variantes: [{ sku: 'UL-OCEAN-BLUE-ANU-N', precio: 799, activo: true }] }, rpc: { guardar_cotizaciones: () => [] } });
  assert.equal((await cotizar(post(COT), { admin: mitad.admin, envia: enviaFalso({ estafeta: caido, dhl: tarifa('dhl', 99) }).envia, turnstile: ok })).status, 200,
    'si una paquetería falla, se ofrecen las demás');
  assert.equal((await cotizar(post({ ...COT, precio: 1 }), { admin: b.admin, envia: null, turnstile: ok })).status, 400, 'campos de más → 400');
});

// ---------------------------------------------------------------------------------- envios-guia
const auth = { Authorization: 'Bearer jwt-valido' };
const PID = '00000000-0000-4000-8000-000000000009';
const RESERVA = {
  envio: 'e-1', folio: 'AGO-1', piezas: 1, subtotal: 799, contacto: { nombre: 'Ana', telefono: '5512345678' },
  entrega: { carrier: 'estafeta', servicio: 'ground', direccion_envio: { calle: 'Av 1', colonia: 'Roma', ciudad: 'CDMX', estado: 'CDMX', cp: '06600' } },
};
const generar = () => Response.json({ meta: 'generate', data: [{ trackingNumber: 'EST1', trackUrl: 'https://t/EST1', label: 'https://l/EST1.pdf', totalPrice: 125, shipmentId: 9 }] });

Deno.test('envios-guia: la ayudante genera la guía con la paquetería que eligió la clienta y se guarda', async () => {
  const b = bd({ rol: 'ayudante', rpc: { envio_reservar_guia: () => RESERVA, envio_guardar_guia: () => null } });
  const { envia, vistos } = enviaFalso({ estafeta: generar });
  const r = await guia(post({ accion: 'generar', pedido: PID }, auth), { admin: b.admin, envia, r2: null, fetchFn: fetch });
  assert.equal(r.status, 200);
  assert.equal(((vistos[0].cuerpo.shipment) as { service: string }).service, 'ground');
  assert.equal(((vistos[0].cuerpo.destination) as { postalCode: string }).postalCode, '06600');
  const g = b.hizo('envio_guardar_guia')[0].args.p_datos as Record<string, unknown>;
  assert.equal(g.guia, 'EST1');
  assert.equal(g.etiqueta_url, 'https://l/EST1.pdf', 'sin bucket de R2 se guarda el enlace de Envia');
});

Deno.test('envios-guia: sin sesión 401; guía repetida 409; si Envia falla se marca el error y responde 502', async () => {
  const b = bd({ rpc: { envio_reservar_guia: () => RESERVA } });
  assert.equal((await guia(post({ accion: 'generar', pedido: PID }), { admin: b.admin, envia: null, r2: null, fetchFn: fetch })).status, 401);
  const rep = bd({ rpc: { envio_reservar_guia: () => ({ data: null, error: { message: 'guia_existente', code: 'P0001' } }) } });
  assert.equal((await guia(post({ accion: 'generar', pedido: PID }, auth), { admin: rep.admin, envia: enviaFalso({}).envia, r2: null, fetchFn: fetch })).status, 409);
  const falla = bd({ rpc: { envio_reservar_guia: () => RESERVA } });
  const r = await guia(post({ accion: 'generar', pedido: PID }, auth), { admin: falla.admin, envia: enviaFalso({ estafeta: () => new Response('x', { status: 500 }) }).envia, r2: null, fetchFn: fetch });
  assert.equal(r.status, 502);
  assert.equal(falla.hizo('envio_marcar_error')[0].args.p_envio, 'e-1', 'la reserva de la guía queda en error y se puede reintentar');
});

// -------------------------------------------------------------------------------- webhook-envia
const SECRETO = 's'.repeat(32);
Deno.test('webhook-envia: secreto incorrecto 401; el estado se consulta a Envia (no se cree el aviso); repetido no se procesa', async () => {
  const b = bd({ rpc: { registrar_evento: () => true, registrar_rastreo_envio: () => ({ resultado: 'entregado' }) } });
  const { envia } = enviaFalso({}, 'Delivered');
  const malo = await webhook(post({ trackingNumber: 'EST1', status: 'Delivered' }, {}, 'http://x?s=otro'), { admin: b.admin, envia, secreto: SECRETO });
  assert.equal(malo.status, 401);
  assert.equal(b.hizo('registrar_evento').length, 0);

  // El aviso dice "In transit" pero la API dice "Delivered": manda la API
  const r = await webhook(post({ trackingNumber: 'EST1', status: 'In transit' }, { 'X-Webhook-Id': 'w-1' }, `http://x?s=${SECRETO}`), { admin: b.admin, envia, secreto: SECRETO });
  assert.equal(r.status, 200);
  const reg = b.hizo('registrar_rastreo_envio')[0].args;
  assert.equal(reg.p_categoria, 'entregado');
  assert.equal(b.hizo('registrar_evento')[0].args.p_id_evento, 'envia:w-1', 'idempotencia por X-Webhook-Id');

  const rep = bd({ rpc: { registrar_evento: () => false } });
  const r2 = await webhook(post({ trackingNumber: 'EST1' }, { 'X-Webhook-Id': 'w-1' }, `http://x?s=${SECRETO}`), { admin: rep.admin, envia, secreto: SECRETO });
  assert.equal((await r2.json()).repetido, true);
  assert.equal(rep.hizo('registrar_rastreo_envio').length, 0);
  // Sin secreto configurado (o corto): falla cerrado
  assert.equal((await webhook(post({ trackingNumber: 'EST1' }, {}, 'http://x?s=corto'), { admin: b.admin, envia, secreto: 'corto' })).status, 503);
});
