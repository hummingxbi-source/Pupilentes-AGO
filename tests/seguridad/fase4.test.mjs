// Pruebas de seguridad e integración · Fase 4 · envíos por paquetería (Envia.com simulado: scripts/envia-simulado.mjs).
// Requisitos: los de fase3.test.mjs + el simulador de Envia en ENVIA_SIM_URL (por defecto http://127.0.0.1:8091),
// con las funciones servidas con ENVIA_TOKEN, ENVIA_API_URL=http://host.docker.internal:8091 y ENVIA_WEBHOOK_SECRET.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TURNSTILE, fn, uno, pedidoDe, skuCon, cuerpoPedido, cuentaPanel } from './_comun.mjs';

const ENVIA = (process.env.ENVIA_SIM_URL || 'http://127.0.0.1:8091').replace(/\/$/, '');
const SECRETO = process.env.ENVIA_WEBHOOK_SECRET;
const DESTINO = { cp: '06600', ciudad: 'Cuauhtémoc', estado: 'Ciudad de México', colonia: 'Juárez' };
const DIR = { calle: 'Av. Reforma', numero: '222', colonia: 'Juárez', ciudad: 'Cuauhtémoc', estado: 'Ciudad de México', cp: '06600' };

async function cotizar(v, cantidad = 1, destino = DESTINO) {
  return fn('envios-cotizar', { items: [{ sku: v.sku, cantidad }], destino, turnstile: TURNSTILE });
}
function pedidoPaq(v, opcion, { dir = DIR, cantidad = 1, total } = {}) {
  const c = cuerpoPedido(v, { metodo: 'transferencia', cantidad, total: total ?? v.precio * cantidad + opcion.precio });
  c.entrega = { tipo: 'paqueteria', zona: 'Paquetería', cotizacion: opcion.id, direccion_envio: dir, direccion: 'Av. Reforma 222, Juárez' };
  return fn('pedidos-crear', c);
}
const rastreo = (trackingNumber, status) => fetch(`${ENVIA}/simular/rastreo`, {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ trackingNumber, status }),
}).then((r) => r.json());

test('cotizar: el servidor devuelve opciones de varias paqueterías, cada una con su id guardado', async () => {
  const v = await skuCon();
  const r = await cotizar(v);
  assert.equal(r.status, 200, JSON.stringify(r.datos));
  assert.ok(r.datos.opciones.length >= 2);
  assert.ok(new Set(r.datos.opciones.map((o) => o.carrier)).size >= 2, 'una petición por paquetería');
  assert.ok(r.datos.opciones.every((o) => /^[0-9a-f-]{36}$/.test(o.id) && o.precio > 0));
});

test('cotizar: código postal sin cobertura → 400 con mensaje claro', async () => {
  const v = await skuCon();
  const r = await cotizar(v, 1, { ...DESTINO, cp: '00000' });
  assert.equal(r.status, 400);
  assert.equal(r.datos.error, 'sin_cobertura');
});

test('pedido por paquetería: cobra el envío cotizado; un total o un CP alterados se rechazan', async () => {
  const v = await skuCon();
  const [o] = (await cotizar(v)).datos.opciones;
  const malo = await pedidoPaq(v, o, { total: v.precio + 1 });
  assert.equal(malo.status, 409);
  assert.equal(malo.datos.total, v.precio + o.precio, 'el servidor responde con el envío de la cotización');
  const otroCp = await pedidoPaq(v, o, { dir: { ...DIR, cp: '01000' } });
  assert.equal(otroCp.status, 409);
  assert.equal(otroCp.datos.error, 'cotizacion_no_coincide');
  const bien = await pedidoPaq(v, o);
  assert.equal(bien.status, 200, JSON.stringify(bien.datos));
  assert.equal(bien.datos.envio, o.precio);
  const p = await uno('select entrega from public.pedidos where folio = $1', [bien.datos.folio]);
  assert.equal(p.entrega.carrier, o.carrier);
});

test('guía y rastreo: la dueña genera la guía (una sola), el aviso de Envia mueve el pedido a enviado y entregado', async () => {
  const v = await skuCon();
  const [o] = (await cotizar(v)).datos.opciones;
  const r = await pedidoPaq(v, o);
  const p = await pedidoDe(r.datos.folio);
  const { aal2 } = await cuentaPanel('duena');
  assert.equal((await fn('envios-guia', { accion: 'generar', pedido: p.id }, { token: aal2 })).status, 409, 'sin pagar no hay guía');
  assert.equal((await fn('panel-pedidos', { accion: 'validar_transferencia', pedido: p.id, aprobar: true }, { token: aal2 })).status, 200);

  const [g1, g2] = await Promise.all([
    fn('envios-guia', { accion: 'generar', pedido: p.id }, { token: aal2 }),
    fn('envios-guia', { accion: 'generar', pedido: p.id }, { token: aal2 }),
  ]);
  const ok = [g1, g2].filter((g) => g.status === 200);
  assert.equal(ok.length, 1, `doble clic → una sola guía (${g1.status}/${g2.status})`);
  assert.ok([g1, g2].some((g) => g.status === 409));
  const guia = ok[0].datos.guia;
  assert.equal((await pedidoDe(r.datos.folio)).estado, 'preparando');

  assert.equal((await rastreo(guia, 'In transit')).aviso, 200);
  assert.equal((await pedidoDe(r.datos.folio)).estado, 'enviado');
  assert.equal((await rastreo(guia, 'Delivered')).aviso, 200);
  assert.equal((await pedidoDe(r.datos.folio)).estado, 'entregado');
  const env = await uno(`select estado from public.envios where guia = $1`, [guia]);
  assert.equal(env.estado, 'entregado');
});

test('guía: la ayudante (con MFA) también puede generarla; sin sesión → 401', async () => {
  const v = await skuCon();
  const [o] = (await cotizar(v)).datos.opciones;
  const r = await pedidoPaq(v, o);
  const p = await pedidoDe(r.datos.folio);
  assert.equal((await fn('envios-guia', { accion: 'generar', pedido: p.id })).status, 401);
  const duena = await cuentaPanel('duena');
  await fn('panel-pedidos', { accion: 'validar_transferencia', pedido: p.id, aprobar: true }, { token: duena.aal2 });
  const { aal2 } = await cuentaPanel('ayudante');
  const g = await fn('envios-guia', { accion: 'generar', pedido: p.id }, { token: aal2 });
  assert.equal(g.status, 200, JSON.stringify(g.datos));
});

test('webhook-envia: sin el secreto de la URL → 401 y nada cambia; guía ajena → no toca pedidos', async () => {
  const sin = await fn('webhook-envia', { trackingNumber: 'SIM100001', status: 'Delivered' }, { origen: null, query: '?s=no-es-el-secreto' });
  assert.equal(sin.status, 401);
  assert.ok(SECRETO, 'falta ENVIA_WEBHOOK_SECRET en el entorno de la prueba');
  // Con el secreto pero una guía que no existe en Envia: la consulta no la encuentra y no se registra nada
  const ajena = await fn('webhook-envia', { trackingNumber: 'NOEXISTE123', status: 'Delivered' }, { origen: null, query: `?s=${SECRETO}`, encabezados: { 'X-Webhook-Id': crypto.randomUUID() } });
  assert.equal(ajena.status, 500, 'Envia no conoce la guía → el aviso falla y queda registrado');
  assert.equal(Number((await uno(`select count(*) from public.envios where guia = 'NOEXISTE123'`)).count), 0);
});
