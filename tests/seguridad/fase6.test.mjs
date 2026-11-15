// Pruebas de integración · Fase 6 · TikTok Shop (scripts/tiktok-simulado.mjs, que además rechaza peticiones mal firmadas).
// Requisitos: los de fase3.test.mjs + el simulador en TT_SIM_URL (por defecto http://127.0.0.1:8093), con las funciones
// servidas con TT_APP_KEY=ttkey, TT_APP_SECRET (el mismo del simulador), TT_SERVICE_ID y las URL del simulador.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { API, CRON, db, fn, stock, cuentaPanel } from './_comun.mjs';

const TT = (process.env.TT_SIM_URL || 'http://127.0.0.1:8093').replace(/\/$/, '');
const sim = (ruta, cuerpo) => fetch(`${TT}${ruta}`, cuerpo === undefined ? {} : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(cuerpo) }).then((r) => r.json());
const cron = () => fetch(`${API}/functions/v1/cron-conciliar`, { method: 'POST', headers: { 'x-cron-secret': CRON } }).then(async (r) => ({ status: r.status, datos: await r.json() }));
async function esperar(cond, ms = 8000) { const fin = Date.now() + ms; while (Date.now() < fin) { if (await cond()) return true; await new Promise((r) => setTimeout(r, 250)); } return false; }
async function fijarStock(sku, n) {
  const s = await stock(sku);
  if (s.stock !== n) await db.query(`select public.mover_stock((select id from public.variantes where sku = $1), $2, 'ajuste', $3, 'panel')`, [sku, n - s.stock, `ci:${randomUUID()}`]);
}
const PROD = '1730000000000000001', SKU_A = '1730000000000000101', SKU_B = '1730000000000000102', SKU_AJENO = '1730000000000000103';
const NUESTRO_A = 'UL-SIRI-BLUE-ANU-N', NUESTRO_B = 'UL-HONEY-BROWN-ANU-N';
let duena;

test('conectar TikTok: OAuth + tienda autorizada (shop_cipher) en Vault', async () => {
  duena = await cuentaPanel('duena');
  const { datos: { url } } = await fn('panel-tiktok', { accion: 'conectar' }, { token: duena.aal2 });
  const r = await fetch(url, { redirect: 'manual' });
  const regreso = new URL(r.headers.get('location'));
  assert.equal(regreso.searchParams.get('canal'), 'tiktok');
  const cb = await fn('panel-tiktok', { accion: 'callback', code: regreso.searchParams.get('code'), state: regreso.searchParams.get('state') }, { token: duena.aal2 });
  assert.equal(cb.status, 200, JSON.stringify(cb.datos));
  const e = await fn('panel-tiktok', { accion: 'estado' }, { token: duena.aal2 });
  assert.equal(e.datos.conectada, true);
  assert.equal(e.datos.cuenta.id, '7494000000000000001');
});

test('productos y vínculos por SKU (las peticiones firmadas las acepta TikTok)', async () => {
  const p = await fn('panel-tiktok', { accion: 'publicaciones' }, { token: duena.aal2 });
  assert.equal(p.status, 200, JSON.stringify(p.datos));
  assert.equal(p.datos.filas.length, 3);
  assert.equal(p.datos.filas.find((f) => f.variacion === SKU_A).sku_canal, NUESTRO_A);
  for (const s of [NUESTRO_A, NUESTRO_B]) await fijarStock(s, 6);
  for (const [v, sku] of [[SKU_A, NUESTRO_A], [SKU_B, NUESTRO_B]]) {
    assert.equal((await fn('panel-tiktok', { accion: 'vincular', item: PROD, variacion: v, sku, logistica: 'propia' }, { token: duena.aal2 })).status, 200);
  }
});

test('venta pagada con aviso firmado → baja el inventario; aviso con firma falsa → 401', async () => {
  const antes = (await stock(NUESTRO_A)).stock;
  const v = await sim('/simular/venta', { producto: PROD, sku: SKU_A, cantidad: 2 });
  assert.equal(v.aviso, 200);
  assert.ok(await esperar(async () => (await stock(NUESTRO_A)).stock === antes - 2), 'bajaron 2 pares (dos líneas de 1)');
  assert.equal((await sim('/simular/aviso-falso', { orden: v.orden })).aviso, 401);
  assert.equal((await stock(NUESTRO_A)).stock, antes - 2);
});

test('orden sin pagar no mueve stock; venta con aviso perdido la recupera el cron', async () => {
  const antesB = (await stock(NUESTRO_B)).stock;
  await sim('/simular/venta', { producto: PROD, sku: SKU_B, cantidad: 1, estado: 'UNPAID' });
  await sim('/simular/venta', { producto: PROD, sku: SKU_B, cantidad: 1, sin_aviso: true });
  const c = await cron();
  assert.equal(c.datos.tiktok?.conectada, true, JSON.stringify(c.datos.tiktok));
  assert.equal((await stock(NUESTRO_B)).stock, antesB - 1, 'solo la pagada');
});

test('sincronización: apagada no publica; encendida publica nuestro disponible y no toca SKU ajenos', async () => {
  const antes = (await sim(`/simular/productos/${PROD}`)).skus.find((s) => s.id === SKU_A).inventory[0].quantity;
  await fijarStock(NUESTRO_A, 9);
  await cron();
  assert.equal((await sim(`/simular/productos/${PROD}`)).skus.find((s) => s.id === SKU_A).inventory[0].quantity, antes);
  assert.equal((await fn('panel-tiktok', { accion: 'sincronizacion', activa: true }, { token: duena.aal2 })).status, 200);
  const c = await cron();
  assert.equal(c.datos.tiktok?.fallidas, 0, JSON.stringify(c.datos.tiktok));
  const p = await sim(`/simular/productos/${PROD}`);
  const disp = async (sku) => { const s = await stock(sku); return s.stock - s.stock_reservado; };
  assert.equal(p.skus.find((s) => s.id === SKU_A).inventory[0].quantity, await disp(NUESTRO_A));
  assert.equal(p.skus.find((s) => s.id === SKU_B).inventory[0].quantity, await disp(NUESTRO_B));
  assert.equal(p.skus.find((s) => s.id === SKU_AJENO).inventory[0].quantity, 2, 'el SKU que solo existe en TikTok no se toca');
});
