// Pruebas de integración · Fase 5 · Mercado Libre (scripts/ml-simulado.mjs).
// Requisitos: los de fase3.test.mjs + el simulador de ML en ML_SIM_URL (por defecto http://127.0.0.1:8092),
// con las funciones servidas con ML_APP_ID=123, ML_API_URL=http://host.docker.internal:8092 y ML_AUTH_URL=http://127.0.0.1:8092.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { API, CRON, db, fn, uno, stock, cuentaPanel } from './_comun.mjs';

const ML = (process.env.ML_SIM_URL || 'http://127.0.0.1:8092').replace(/\/$/, '');
const sim = (ruta, cuerpo) => fetch(`${ML}${ruta}`, cuerpo === undefined ? {} : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(cuerpo) }).then((r) => r.json());
const cron = () => fetch(`${API}/functions/v1/cron-conciliar`, { method: 'POST', headers: { 'x-cron-secret': CRON } }).then(async (r) => ({ status: r.status, datos: await r.json() }));
async function esperar(cond, ms = 8000) {
  const fin = Date.now() + ms;
  while (Date.now() < fin) { if (await cond()) return true; await new Promise((r) => setTimeout(r, 250)); }
  return false;
}
/** Deja una variante con exactamente `n` pares (con un ajuste registrado, como lo haría el panel). */
async function fijarStock(sku, n) {
  const s = await stock(sku);
  if (s.stock !== n) await db.query(`select public.mover_stock((select id from public.variantes where sku = $1), $2, 'ajuste', $3, 'panel')`, [sku, n - s.stock, `ci:${randomUUID()}`]);
}

const SKU_SIMPLE = 'UL-CLOUD-GRAY-ANU-N', SKU_VAR = 'UL-OCEAN-BLUE-ANU-N', SKU_FULL = 'FRES-FRESHLADY-AZUL-ANU-N';
let duena;

test('conectar: OAuth con state de un solo uso; los tokens quedan en Vault', async () => {
  duena = await cuentaPanel('duena');
  const e0 = await fn('panel-ml', { accion: 'estado' }, { token: duena.aal2 });
  assert.equal(e0.status, 200, JSON.stringify(e0.datos));
  assert.equal(e0.datos.conectada, false);
  const { datos: { url } } = await fn('panel-ml', { accion: 'conectar' }, { token: duena.aal2 });
  const r = await fetch(url, { redirect: 'manual' });
  assert.equal(r.status, 302);
  const regreso = new URL(r.headers.get('location'));
  const code = regreso.searchParams.get('code'), state = regreso.searchParams.get('state');
  // El state solo sirve para quien lo pidió
  const ayudante = await cuentaPanel('ayudante');
  assert.equal((await fn('panel-ml', { accion: 'callback', code, state }, { token: ayudante.aal2 })).status, 403);
  const cb = await fn('panel-ml', { accion: 'callback', code, state }, { token: duena.aal2 });
  assert.equal(cb.status, 200, JSON.stringify(cb.datos));
  assert.equal((await fn('panel-ml', { accion: 'callback', code, state }, { token: duena.aal2 })).status, 400, 'el state no se reutiliza');
  const i = await uno(`select estado, secreto_vault is not null as en_vault, row_to_json(x)::text as fila from privado.integraciones x where canal = 'ml'`);
  assert.equal(i.estado, 'conectada');
  assert.equal(i.en_vault, true);
  assert.ok(!i.fila.includes('APP_USR'), 'el token no está en la tabla');
});

test('publicaciones y vínculos: se ven variaciones, SKU de ML y Full', async () => {
  const p = await fn('panel-ml', { accion: 'publicaciones' }, { token: duena.aal2 });
  assert.equal(p.status, 200, JSON.stringify(p.datos));
  const f = p.datos.filas;
  assert.equal(f.find((x) => x.item === 'MLM100100')?.sku_ml, SKU_SIMPLE);
  assert.equal(f.filter((x) => x.item === 'MLM200200').length, 3, 'una fila por variación');
  assert.equal(f.find((x) => x.item === 'MLM300300')?.logistica, 'full');
  for (const sku of [SKU_SIMPLE, SKU_VAR, SKU_FULL]) await fijarStock(sku, 6);
  for (const v of [
    { item: 'MLM100100', sku: SKU_SIMPLE, logistica: 'propia' },
    { item: 'MLM200200', variacion: '20001', sku: SKU_VAR, logistica: 'propia' },
    { item: 'MLM300300', sku: SKU_FULL, logistica: 'full' },
  ]) assert.equal((await fn('panel-ml', { accion: 'vincular', ...v }, { token: duena.aal2 })).status, 200);
});

test('venta en ML con aviso → baja nuestro inventario (sin esperar al cron)', async () => {
  const antes = (await stock(SKU_SIMPLE)).stock;
  const v = await sim('/simular/venta', { item: 'MLM100100', cantidad: 1 });
  assert.equal(v.aviso, 200, 'el webhook respondió 200');
  assert.ok(await esperar(async () => (await stock(SKU_SIMPLE)).stock === antes - 1), 'el stock bajó 1');
});

test('venta en ML cuyo aviso se perdió → el cron la recupera; la venta en Full no toca nuestro inventario', async () => {
  const antesVar = (await stock(SKU_VAR)).stock, antesFull = (await stock(SKU_FULL)).stock;
  await sim('/simular/venta', { item: 'MLM200200', variacion: '20001', cantidad: 2, sin_aviso: true });
  await sim('/simular/venta', { item: 'MLM300300', cantidad: 1 });
  const c = await cron();
  assert.equal(c.status, 200, JSON.stringify(c.datos));
  assert.equal(c.datos.mercadolibre?.conectada, true, JSON.stringify(c.datos.mercadolibre));
  assert.equal((await stock(SKU_VAR)).stock, antesVar - 2);
  assert.ok(await esperar(async () => (await uno(`select count(*)::int as n from privado.eventos_webhook where proveedor = 'ml' and procesado_en is not null`)).n >= 2));
  assert.equal((await stock(SKU_FULL)).stock, antesFull);
});

test('sincronización apagada: nada se publica en ML; la ayudante no la puede encender', async () => {
  const antes = (await sim('/simular/items/MLM100100')).available_quantity;
  await fijarStock(SKU_SIMPLE, 9);
  await cron();
  assert.equal((await sim('/simular/items/MLM100100')).available_quantity, antes, 'ML conserva su cantidad');
  const ayudante = await cuentaPanel('ayudante');
  assert.equal((await fn('panel-ml', { accion: 'sincronizacion', activa: true }, { token: ayudante.aal2 })).status, 403);
});

test('sincronización encendida: se publica nuestro disponible y las variaciones ajenas no se tocan', async () => {
  assert.equal((await fn('panel-ml', { accion: 'sincronizacion', activa: true }, { token: duena.aal2 })).status, 200);
  const siriAntes = (await sim('/simular/items/MLM200200')).variations.find((x) => x.id === 20002).available_quantity;
  const c = await cron();
  assert.equal(c.datos.mercadolibre?.fallidas, 0, JSON.stringify(c.datos.mercadolibre));
  const disp = async (sku) => { const s = await stock(sku); return s.stock - s.stock_reservado; };
  assert.equal((await sim('/simular/items/MLM100100')).available_quantity, await disp(SKU_SIMPLE));
  const it = await sim('/simular/items/MLM200200');
  assert.equal(it.variations.length, 3, 'ninguna variación se borró');
  assert.equal(it.variations.find((x) => x.id === 20001).available_quantity, await disp(SKU_VAR));
  assert.equal(it.variations.find((x) => x.id === 20002).available_quantity, siriAntes, 'la variación no vinculada conserva su stock');
  assert.equal((await sim('/simular/items/MLM300300')).available_quantity, 8, 'Full no se toca (9 − 1 vendida)');
});

test('webhook de otra app o de otra cuenta → 200 y nada cambia', async () => {
  const antes = (await stock(SKU_SIMPLE)).stock;
  const r = await fetch(`${API}/functions/v1/webhook-mercadolibre`, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ _id: randomUUID(), resource: '/orders/2000000001', user_id: 777001, topic: 'orders_v2', application_id: 999 }) });
  assert.equal(r.status, 200);
  await new Promise((x) => setTimeout(x, 800));
  assert.equal((await stock(SKU_SIMPLE)).stock, antes);
});
