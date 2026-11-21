// Fase 8 · F2 · Canales (docs/PLAN-PRUEBAS.md §4.5 K3–K8, §4.3 D15 colchón y desconectar, D16, §6.2 S5).
// Simuladores de scripts/ (ml-simulado :8092, tiktok-simulado :8093) y Edge Functions reales, como fase5/fase6.
// Los simuladores guardan su estado en memoria entre archivos: cada prueba mide antes y después, no supone valores.
// Requisitos: los de fase5.test.mjs y fase6.test.mjs. K8 pausa el simulador de ML (SIGSTOP/SIGCONT) con el PID
// que deja scripts/entorno-pruebas.sh en .pruebas/mercadolibre.pid; sin ese archivo, K8 se omite.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { API, CRON, db, fn, uno, stock, cuentaPanel } from './_comun.mjs';

const ML = (process.env.ML_SIM_URL || 'http://127.0.0.1:8092').replace(/\/$/, '');
const TT = (process.env.TT_SIM_URL || 'http://127.0.0.1:8093').replace(/\/$/, '');
const pedir = (base) => (ruta, cuerpo) => fetch(`${base}${ruta}`, cuerpo === undefined ? {} : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(cuerpo) }).then((r) => r.json());
const ml = pedir(ML), tt = pedir(TT);
const cron = () => fetch(`${API}/functions/v1/cron-conciliar`, { method: 'POST', headers: { 'x-cron-secret': CRON } }).then(async (r) => ({ status: r.status, datos: await r.json() }));
async function esperar(cond, ms = 8000) {
  const fin = Date.now() + ms;
  while (Date.now() < fin) { if (await cond()) return true; await new Promise((r) => setTimeout(r, 250)); }
  return false;
}
/** Deja `n` pares DISPONIBLES (stock = apartado + n), con un ajuste registrado. Nunca por debajo de lo apartado (I1). */
async function fijarStock(sku, n) {
  const s = await stock(sku);
  const meta = s.stock_reservado + n;
  if (s.stock !== meta) await db.query(`select public.mover_stock((select id from public.variantes where sku = $1), $2, 'ajuste', $3, 'panel')`, [sku, meta - s.stock, `ci:${randomUUID()}`]);
}
const disponible = async (sku) => { const s = await stock(sku); return s.stock - s.stock_reservado; };
const movimientos = (ref) => db.query(`select motivo, delta from public.movimientos_stock where ref_externa like $1 order by creado_en`, [ref]).then((r) => r.rows);
const alertasAbiertas = (tipo) => db.query(`select detalle from privado.alertas where tipo = $1 and not atendida`, [tipo]).then((r) => r.rows);

// Publicaciones del simulador de ML y SKU de TikTok (scripts/*-simulado.mjs)
const ML_SIMPLE = 'MLM100100', ML_VAR = 'MLM200200', ML_VAR_NUESTRA = '20001', ML_VAR_AJENA = '20002';
const TT_PROD = '1730000000000000001', TT_SKU_A = '1730000000000000101', TT_SKU_B = '1730000000000000102', TT_AJENO = '1730000000000000103';
// Variantes nuestras para estas pruebas (distintas de las que usan fase5 y fase6)
const SKU_K = 'UL-MINT-GREEN-ANU-N', SKU_T = 'UL-STORM-GRAY-ANU-N';

let duena;
async function conectar(canal) {
  const f = canal === 'ml' ? 'panel-ml' : 'panel-tiktok';
  const { datos: { url } } = await fn(f, { accion: 'conectar' }, { token: duena.aal2 });
  const r = await fetch(url, { redirect: 'manual' });
  const regreso = new URL(r.headers.get('location'));
  const cb = await fn(f, { accion: 'callback', code: regreso.searchParams.get('code'), state: regreso.searchParams.get('state') }, { token: duena.aal2 });
  assert.equal(cb.status, 200, JSON.stringify(cb.datos));
}
const vincular = (canal, item, variacion, sku, logistica = 'propia') =>
  fn(canal === 'ml' ? 'panel-ml' : 'panel-tiktok', { accion: 'vincular', item, ...(variacion ? { variacion } : {}), sku, logistica }, { token: duena.aal2 });

test('preparación: SKU de prueba existen; ML y TikTok conectados y vinculados (sin sincronizar)', async () => {
  for (const s of [SKU_K, SKU_T]) assert.ok(await uno('select 1 as ok from public.variantes where sku = $1 and activo', [s]), `falta ${s} en la semilla`);
  duena = await cuentaPanel('duena');
  await conectar('ml');
  await conectar('tiktok');
  assert.equal((await vincular('ml', ML_SIMPLE, null, SKU_K)).status, 200);
  assert.equal((await vincular('tiktok', TT_PROD, TT_SKU_A, SKU_T)).status, 200);
  await fn('panel-ml', { accion: 'sincronizacion', activa: false }, { token: duena.aal2 });
  await fn('panel-tiktok', { accion: 'sincronizacion', activa: false }, { token: duena.aal2 });
  // El cron concilia las órdenes de las últimas 48 h: al vincular, aplica las ventas viejas de los simuladores
  // (hallazgo H12). Se deja correr una vez antes de medir.
  await cron();
  for (const s of [SKU_K, SKU_T]) await fijarStock(s, 6);
});

// ------------------------------------------------------------------------------------------- K3
test('K3 · venta cancelada en ML: el stock regresa una sola vez (aviso + cron)', async () => {
  const antes = (await stock(SKU_K)).stock;
  const v = await ml('/simular/venta', { item: ML_SIMPLE, cantidad: 1 });
  assert.equal(v.aviso, 200);
  assert.ok(await esperar(async () => (await stock(SKU_K)).stock === antes - 1), 'la venta bajó 1');
  const c = await ml('/simular/cancelar', { orden: v.orden });
  assert.equal(c.aviso, 200);
  assert.ok(await esperar(async () => (await stock(SKU_K)).stock === antes), 'la cancelación lo regresó');
  await cron();                                                     // el cron vuelve a ver la orden cancelada
  assert.equal((await stock(SKU_K)).stock, antes, 'no se devolvió dos veces');
  const m = await movimientos(`%:${v.orden}:${ML_SIMPLE}:-`);
  assert.deepEqual(m.map((x) => [x.motivo, x.delta]), [['venta', -1], ['devolucion', 1]]);
});

test('K3 · orden CANCELLED en TikTok: el stock regresa una sola vez', async () => {
  const antes = (await stock(SKU_T)).stock;
  const v = await tt('/simular/venta', { producto: TT_PROD, sku: TT_SKU_A, cantidad: 1 });
  assert.equal(v.aviso, 200);
  assert.ok(await esperar(async () => (await stock(SKU_T)).stock === antes - 1));
  assert.equal((await tt('/simular/cancelar', { orden: v.orden })).aviso, 200);
  assert.ok(await esperar(async () => (await stock(SKU_T)).stock === antes), 'regresó');
  await cron();
  assert.equal((await stock(SKU_T)).stock, antes, 'no se devolvió dos veces');
  const m = await movimientos(`%:${v.orden}:${TT_PROD}:${TT_SKU_A}`);
  assert.deepEqual(m.map((x) => [x.motivo, x.delta]), [['venta', -1], ['devolucion', 1]]);
});

test('K3 · cancelación de una venta cuyo aviso se perdió: no devuelve nada que no se haya vendido', async () => {
  const antes = (await stock(SKU_K)).stock;
  const v = await ml('/simular/venta', { item: ML_SIMPLE, cantidad: 1, sin_aviso: true });
  await ml('/simular/cancelar', { orden: v.orden });                 // llega la cancelación antes que la venta
  await new Promise((r) => setTimeout(r, 800));
  await cron();
  assert.equal((await stock(SKU_K)).stock, antes, 'ni baja ni sube');
});

// ------------------------------------------------------------------------------------------- K4
test('K4 · venta de 2 piezas: ML (cantidad 2) y TikTok (2 líneas del mismo SKU) descuentan 2', async () => {
  const k0 = (await stock(SKU_K)).stock, t0 = (await stock(SKU_T)).stock;
  await ml('/simular/venta', { item: ML_SIMPLE, cantidad: 2 });
  await tt('/simular/venta', { producto: TT_PROD, sku: TT_SKU_A, cantidad: 2 });
  assert.ok(await esperar(async () => (await stock(SKU_K)).stock === k0 - 2), 'ML −2');
  assert.ok(await esperar(async () => (await stock(SKU_T)).stock === t0 - 2), 'TikTok −2');
  await cron();
  assert.equal((await stock(SKU_K)).stock, k0 - 2);
  assert.equal((await stock(SKU_T)).stock, t0 - 2);
});

// ------------------------------------------------------------------------------------------- K2
test('K2 · venta de un SKU con "Fulfilled by TikTok": no toca nuestro inventario físico', async () => {
  assert.equal((await vincular('tiktok', TT_PROD, TT_SKU_B, SKU_T, 'full')).status, 200);
  try {
    const antes = (await stock(SKU_T)).stock;
    const v = await tt('/simular/venta', { producto: TT_PROD, sku: TT_SKU_B, cantidad: 1 });
    assert.equal(v.aviso, 200);
    await new Promise((r) => setTimeout(r, 1000));
    await cron();
    assert.equal((await stock(SKU_T)).stock, antes, 'Full no descuenta de nuestra bodega');
    assert.deepEqual(await movimientos(`tt:${v.orden}:%`), []);
  } finally {
    await db.query(`update public.publicaciones_canal set activo = false where canal = 'tiktok' and id_externo_variante = $1`, [TT_SKU_B]);
  }
});

// ------------------------------------------------------------------------------------------- K6
test('K6 · venta de un artículo sin vincular: no mueve stock, alerta y queda visible para vincular', async () => {
  const total0 = (await uno('select sum(stock)::int as s from public.variantes')).s;
  await ml('/simular/venta', { item: ML_VAR, variacion: ML_VAR_AJENA, cantidad: 1 });
  await tt('/simular/venta', { producto: TT_PROD, sku: TT_AJENO, cantidad: 1 });
  assert.ok(await esperar(async () => (await alertasAbiertas('ml_sin_vincular')).some((a) => a.detalle.variacion === ML_VAR_AJENA)), 'alerta ML');
  assert.ok(await esperar(async () => (await alertasAbiertas('tt_sin_vincular')).some((a) => a.detalle.variacion === TT_AJENO)), 'alerta TikTok');
  assert.equal((await uno('select sum(stock)::int as s from public.variantes')).s, total0, 'ningún stock cambió');
  const pubs = await fn('panel-ml', { accion: 'publicaciones' }, { token: duena.aal2 });
  const fila = pubs.datos.filas.find((f) => f.item === ML_VAR && String(f.variacion) === ML_VAR_AJENA);
  assert.ok(fila, 'aparece en Canales para vincular');
  assert.ok(!fila.sku, `sin vínculo: ${JSON.stringify(fila)}`);
});

// ------------------------------------------------------------------------------------------- K7
test('K7 · venta del canal cuando nuestro stock ya es 0: no baja de 0 y alerta de sobreventa', async () => {
  await fijarStock(SKU_K, 0);
  assert.equal((await stock(SKU_K)).stock, 0, 'la variante de la prueba no tiene apartados: su stock queda en 0');
  const v = await ml('/simular/venta', { item: ML_SIMPLE, cantidad: 1 });
  assert.equal(v.aviso, 200);
  assert.ok(await esperar(async () => (await alertasAbiertas('sobreventa')).some((a) => a.detalle.ref?.includes(String(v.orden)))), 'alerta de sobreventa');
  assert.equal((await stock(SKU_K)).stock, 0, 'no baja de 0');
  await fijarStock(SKU_K, 6);
});

// ------------------------------------------------------------------------------------------- K5
test('K5 · una variante en 2 publicaciones de ML y 1 de TikTok: las 3 reciben el mismo disponible − colchón', async () => {
  // Las dos publicaciones de ML (simple y la variación nuestra) y el SKU A de TikTok → SKU_K
  assert.equal((await vincular('ml', ML_VAR, ML_VAR_NUESTRA, SKU_K)).status, 200);
  assert.equal((await vincular('tiktok', TT_PROD, TT_SKU_A, SKU_K)).status, 200);
  await cron();                                                     // absorbe las ventas viejas de esas publicaciones (H12)
  await fijarStock(SKU_K, 7);
  await db.query('update public.config_tienda set ml_colchon = 1, tt_colchon = 2');
  try {
    assert.equal((await fn('panel-ml', { accion: 'sincronizacion', activa: true }, { token: duena.aal2 })).status, 200);
    assert.equal((await fn('panel-tiktok', { accion: 'sincronizacion', activa: true }, { token: duena.aal2 })).status, 200);
    const c = await cron();
    assert.equal(c.datos.mercadolibre?.fallidas, 0, JSON.stringify(c.datos.mercadolibre));
    assert.equal(c.datos.tiktok?.fallidas, 0, JSON.stringify(c.datos.tiktok));
    const d = await disponible(SKU_K);
    assert.equal((await ml(`/simular/items/${ML_SIMPLE}`)).available_quantity, d - 1, 'ML simple = disponible − colchón ML');
    assert.equal((await ml(`/simular/items/${ML_VAR}`)).variations.find((x) => String(x.id) === ML_VAR_NUESTRA).available_quantity, d - 1, 'ML variación = lo mismo');
    assert.equal((await tt(`/simular/productos/${TT_PROD}`)).skus.find((s) => s.id === TT_SKU_A).inventory[0].quantity, d - 2, 'TikTok = disponible − colchón TikTok');

  } finally {
    await db.query('update public.config_tienda set ml_colchon = 0, tt_colchon = 0');
    await vincular('tiktok', TT_PROD, TT_SKU_A, SKU_T);
  }
});

// H13 (arreglado): al cambiar el colchón, el canal recibe el número nuevo en la siguiente pasada del cron.
test('D15 · H13 · al cambiar el colchón, el canal recibe el número nuevo en la siguiente pasada del cron', async () => {
  await fijarStock(SKU_K, 7);
  await fn('panel-ml', { accion: 'sincronizacion', activa: true }, { token: duena.aal2 });
  await cron();
  const d = await disponible(SKU_K);
  await db.query('update public.config_tienda set ml_colchon = 3');
  try {
    await cron();
    assert.equal((await ml(`/simular/items/${ML_SIMPLE}`)).available_quantity, d - 3);
  } finally {
    await db.query('update public.config_tienda set ml_colchon = 0');
    await cron();
  }
});

// ------------------------------------------------------------------------------------------- K8
test('K8 · ML caído al publicar: el cron no se cae, alerta, deja la publicación en la cola y la publica al volver', { skip: !existsSync('.pruebas/mercadolibre.pid') && 'sin .pruebas/mercadolibre.pid' }, async () => {
  const pid = Number(readFileSync('.pruebas/mercadolibre.pid', 'utf8'));
  const v = await uno('select id from public.variantes where sku = $1', [SKU_K]);
  await fn('panel-ml', { accion: 'sincronizacion', activa: true }, { token: duena.aal2 });
  await cron();
  await fijarStock(SKU_K, (await stock(SKU_K)).stock + 1);         // encola la publicación
  await db.query(`update privado.alertas set atendida = true where tipo = 'conciliacion_fallida' and not atendida`);
  process.kill(pid, 'SIGSTOP');                                    // ML no contesta
  let c;
  try { c = await cron(); } finally { process.kill(pid, 'SIGCONT'); }
  assert.equal(c.status, 200, 'el cron termina aunque ML no conteste');
  assert.ok(c.datos.mercadolibre?.error, `la sección de ML reporta el error: ${JSON.stringify(c.datos.mercadolibre)}`);
  assert.ok((await alertasAbiertas('conciliacion_fallida')).some((a) => a.detalle.canal === 'ml'), 'alerta de conciliación fallida');
  assert.ok(await uno(`select 1 as ok from privado.cola_sync where canal = 'ml' and variante_id = $1`, [v.id]), 'sigue en la cola');
  const c2 = await cron();                                         // ML volvió
  assert.equal(c2.datos.mercadolibre?.fallidas, 0, JSON.stringify(c2.datos.mercadolibre));
  assert.equal((await ml(`/simular/items/${ML_SIMPLE}`)).available_quantity, await disponible(SKU_K), 'publicado al volver');
  assert.equal(await uno(`select 1 as ok from privado.cola_sync where canal = 'ml' and variante_id = $1`, [v.id]), undefined, 'salió de la cola');
});

test('K8 · ML rechaza la publicación: reintentos con espera creciente y alerta al 5.º intento', async () => {
  // MLM300300 es Full en ML: si se vincula por error como "propia", ML rechaza el cambio de stock (400).
  assert.equal((await vincular('ml', 'MLM300300', null, SKU_T, 'propia')).status, 200);
  const v = await uno('select id from public.variantes where sku = $1', [SKU_T]);
  try {
    await fn('panel-ml', { accion: 'sincronizacion', activa: true }, { token: duena.aal2 });
    await fijarStock(SKU_T, (await stock(SKU_T)).stock + 1);
    await db.query(`update privado.cola_sync set proximo_intento = now() where canal = 'ml' and variante_id = $1`, [v.id]);
    const c = await cron();
    assert.ok(c.datos.mercadolibre?.fallidas >= 1, JSON.stringify(c.datos.mercadolibre));
    const cola = await uno(`select intentos, proximo_intento > now() as espera, error from privado.cola_sync where canal = 'ml' and variante_id = $1`, [v.id]);
    assert.ok(cola?.intentos >= 1 && cola.espera, `reintento con espera: ${JSON.stringify(cola)}`);
    assert.match(cola.error ?? '', /400|fulfillment/i);
    // Si sigue fallando: al 5.º intento, alerta
    await db.query(`update privado.cola_sync set intentos = 4, proximo_intento = now() where canal = 'ml' and variante_id = $1`, [v.id]);
    await cron();
    assert.ok((await alertasAbiertas('ml_sync_fallido')).some((a) => a.detalle.sku === SKU_T), 'alerta ml_sync_fallido');
  } finally {
    await vincular('ml', 'MLM300300', null, SKU_T, 'full');       // se corrige el vínculo
    await db.query(`delete from privado.cola_sync where canal = 'ml' and variante_id = $1`, [v.id]);
    await fn('panel-ml', { accion: 'sincronizacion', activa: false }, { token: duena.aal2 });
  }
});

// ------------------------------------------------------------------------------------------ D16
test('D16 · token de ML que ya no se puede refrescar: "requiere autorizar" + alerta; reconectar lo arregla', async () => {
  const t = (await uno('select public.ml_leer_tokens() as t')).t;
  await db.query(`select public.ml_guardar_tokens($1, $2, $3, $4, now() - interval '1 hour')`, [t.cuenta, t.nombre, t.access, 'TG-revocado']);
  await ml('/simular/expirar');
  await cron();
  const e = await fn('panel-ml', { accion: 'estado' }, { token: duena.aal2 });
  assert.equal(e.datos.requiere_autorizar, true, JSON.stringify(e.datos));
  assert.equal(e.datos.conectada, false);
  assert.ok((await alertasAbiertas('ml_token')).length >= 1, 'alerta ml_token');
  await conectar('ml');
  const e2 = await fn('panel-ml', { accion: 'estado' }, { token: duena.aal2 });
  assert.equal(e2.datos.conectada, true, JSON.stringify(e2.datos));
  assert.ok(!e2.datos.requiere_autorizar);
  const c = await cron();
  assert.equal(c.datos.mercadolibre?.conectada, true, JSON.stringify(c.datos.mercadolibre));
});

test('D16 · token de TikTok que ya no se puede refrescar: "requiere autorizar"; reconectar lo arregla', async () => {
  const t = (await uno('select public.tt_leer_tokens() as t')).t;
  await db.query(`select public.tt_guardar_tokens($1, $2, $3, $4, now() - interval '1 hour', $5)`, [t.cuenta, t.nombre, 'TTP_vencido', 'TTP_R_revocado', t.cipher ?? t.shop_cipher ?? null])
    .catch(async () => db.query(`select public.tt_guardar_tokens($1, $2, $3, $4, now() - interval '1 hour')`, [t.cuenta, t.nombre, 'TTP_vencido', 'TTP_R_revocado']));
  await cron();
  const e = await fn('panel-tiktok', { accion: 'estado' }, { token: duena.aal2 });
  assert.equal(e.datos.requiere_autorizar, true, JSON.stringify(e.datos));
  await conectar('tiktok');
  const e2 = await fn('panel-tiktok', { accion: 'estado' }, { token: duena.aal2 });
  assert.equal(e2.datos.conectada, true, JSON.stringify(e2.datos));
});

// ------------------------------------------------------------------------------------------- S5
test('S5 · state de OAuth vencido (10 min) o de otra dueña: rechazado (ML y TikTok)', async () => {
  const otra = await cuentaPanel('duena');
  for (const [canal, f] of [['ml', 'panel-ml'], ['tiktok', 'panel-tiktok']]) {
    // De otra dueña
    const { datos: { url } } = await fn(f, { accion: 'conectar' }, { token: duena.aal2 });
    const reg = new URL((await fetch(url, { redirect: 'manual' })).headers.get('location'));
    const code = reg.searchParams.get('code'), state = reg.searchParams.get('state');
    assert.equal((await fn(f, { accion: 'callback', code, state }, { token: otra.aal2 })).status, 400, `${canal}: state de otra dueña`);
    // Vencido
    await db.query(`update privado.oauth_estados set creado_en = now() - interval '11 minutes' where estado = $1`, [state]);
    assert.equal((await fn(f, { accion: 'callback', code, state }, { token: duena.aal2 })).status, 400, `${canal}: state vencido`);
    // Inventado
    assert.equal((await fn(f, { accion: 'callback', code, state: 'f'.repeat(64) }, { token: duena.aal2 })).status, 400, `${canal}: state inventado`);
  }
});

// ------------------------------------------------------------------------------------------ D15
test('D15 · desconectar ML: tokens fuera, sincronización apagada y sus ventas ya no mueven stock', async () => {
  assert.equal((await fn('panel-ml', { accion: 'desconectar' }, { token: duena.aal2 })).status, 200);
  const i = await uno(`select 1 as ok from privado.integraciones where canal = 'ml'`);
  assert.equal(i, undefined, 'sin integración');
  assert.equal((await uno('select ml_sync_activo from public.config_tienda')).ml_sync_activo, false);
  assert.ok(await uno(`select 1 as ok from public.auditoria_panel where accion = 'ml_desconectar'`), 'auditado');
  const antes = (await stock(SKU_K)).stock;
  const v = await ml('/simular/venta', { item: ML_SIMPLE, cantidad: 1 });
  assert.equal(v.aviso, 200, 'el aviso se acepta (200) aunque no se procese');
  await new Promise((r) => setTimeout(r, 1500));
  await cron();
  assert.equal((await stock(SKU_K)).stock, antes, 'desconectada no mueve stock');
});

// H11 (arreglado): después de desconectar, la dueña vuelve a conectar la misma cuenta. Deja los dos canales
// conectados y sin sincronizar para lo que sigue en la batería (simultaneo, maraton).
test('D15 · H11 · después de desconectar, la dueña puede volver a conectar la misma cuenta (ML y TikTok)', async () => {
  await conectar('ml');                                              // ML se desconectó en la prueba anterior
  assert.equal((await fn('panel-ml', { accion: 'estado' }, { token: duena.aal2 })).datos.conectada, true);
  assert.equal((await fn('panel-tiktok', { accion: 'desconectar' }, { token: duena.aal2 })).status, 200);
  await conectar('tiktok');
  assert.equal((await fn('panel-tiktok', { accion: 'estado' }, { token: duena.aal2 })).datos.conectada, true);
  await fn('panel-ml', { accion: 'sincronizacion', activa: false }, { token: duena.aal2 });
  await fn('panel-tiktok', { accion: 'sincronizacion', activa: false }, { token: duena.aal2 });
});
